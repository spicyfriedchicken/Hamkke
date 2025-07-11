package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"os"

	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
	"github.com/coreos/go-oidc"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/oauth2"
)

var (
	clientID     = mustGetEnv("COGNITO_CLIENT_ID")
	clientSecret = mustGetEnv("COGNITO_CLIENT_SECRET")
	redirectURL  = mustGetEnv("COGNITO_REDIRECT_URI")
	issuerURL    = mustGetEnv("COGNITO_ISSUER_URL")

	provider     *oidc.Provider
	oauth2Config oauth2.Config
)

func computeSecretHash(secret, clientID, username string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(username + clientID))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}
func mustGetEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("Missing required environment variable: %s", key)
	}
	return val
}

func corsHeaders() map[string]string {
	return map[string]string{
		"Content-Type":                "application/json",
		"Access-Control-Allow-Origin": "*",
	}
}

func jsonResponse(statusCode int, payload interface{}) events.APIGatewayProxyResponse {
	jsonBody, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Failed to marshal JSON: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    corsHeaders(),
			Body:       `{"error":"Internal Server Error"}`,
		}
	}
	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Headers:    corsHeaders(),
		Body:       string(jsonBody),
	}
}

func init() {
	var err error
	provider, err = oidc.NewProvider(context.Background(), issuerURL)
	if err != nil {
		log.Fatalf("Failed to create OIDC provider: %v", err)
	}

	oauth2Config = oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Endpoint:     provider.Endpoint(),
		Scopes:       []string{oidc.ScopeOpenID, "email", "profile"},
	}
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	switch req.Path {
	case "/login":
		return handleLogin(req)
	case "/callback":
		return handleCallback(req)
	case "/login-password":
		return handlePasswordLogin(req)
	case "/signup":
		return handleSignup(req)
	default:
		return events.APIGatewayProxyResponse{
			StatusCode: 404,
			Body:       "Route not found, Invalid URL",
		}, nil
	}
}

func handleSignup(req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	var input struct {
		Email     string `json:"email"`
		Password  string `json:"password"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
	}
	if err := json.Unmarshal([]byte(req.Body), &input); err != nil {
		return jsonResponse(400, map[string]string{"error": "Invalid request format"}), nil
	}

	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Printf("Failed to load config: %v", err)
		return jsonResponse(500, map[string]string{"error": "Internal server error"}), nil
	}

	client := cognitoidentityprovider.NewFromConfig(cfg)
	_, err = client.SignUp(context.TODO(), &cognitoidentityprovider.SignUpInput{
		ClientId:   aws.String(clientID),
		SecretHash: aws.String(computeSecretHash(clientSecret, clientID, input.Email)),
		Username:   aws.String(input.Email),
		Password:   aws.String(input.Password),
		UserAttributes: []types.AttributeType{
			{Name: aws.String("email"), Value: aws.String(input.Email)},
			{Name: aws.String("name"), Value: aws.String(fmt.Sprintf("%s %s", input.FirstName, input.LastName))},
		},
	})

	if err != nil {
		log.Printf("Signup error: %v", err)
		return jsonResponse(400, map[string]string{"error": fmt.Sprintf("Signup failed: %v", err)}), nil
	}

	return jsonResponse(201, map[string]string{
		"message": "Signup successful, check your email to confirm.",
	}), nil
}

func handlePasswordLogin(req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	var creds struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.Unmarshal([]byte(req.Body), &creds); err != nil {
		return jsonResponse(400, map[string]string{"error": "Invalid request"}), nil
	}

	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Printf("config load error: %v", err)
		return jsonResponse(500, map[string]string{"error": "Config error"}), nil
	}

	client := cognitoidentityprovider.NewFromConfig(cfg)

	resp, err := client.InitiateAuth(context.TODO(), &cognitoidentityprovider.InitiateAuthInput{
		AuthFlow: "USER_PASSWORD_AUTH",
		ClientId: aws.String(clientID),
		AuthParameters: map[string]string{
			"USERNAME":    creds.Email,
			"PASSWORD":    creds.Password,
			"SECRET_HASH": computeSecretHash(clientSecret, clientID, creds.Email),
		},
	})

	if err != nil {
		log.Printf("Login error: %v", err)
		return jsonResponse(401, map[string]string{"error": "Invalid credentials"}), nil
	}

	return jsonResponse(200, map[string]string{
		"token": *resp.AuthenticationResult.IdToken,
	}), nil
}

func handleLogin(req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	provider := req.QueryStringParameters["provider"]

	params := url.Values{}
	params.Set("response_type", "code")
	params.Set("client_id", oauth2Config.ClientID)
	params.Set("redirect_uri", oauth2Config.RedirectURL)
	params.Set("scope", "openid email profile")
	params.Set("state", "random-state")

	if provider != "" {
		params.Set("identity_provider", provider)
	}

	authURL := oauth2Config.Endpoint.AuthURL + "?" + params.Encode()

	return events.APIGatewayProxyResponse{
		StatusCode: 302,
		Headers:    map[string]string{"Location": authURL},
	}, nil
}

func handleCallback(req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	code, ok := req.QueryStringParameters["code"]
	if !ok || code == "" {
		return jsonResponse(400, map[string]string{"error": "Missing authorization code"}), nil
	}

	token, err := oauth2Config.Exchange(context.Background(), code)
	if err != nil {
		log.Printf("Error exchanging code: %v", err)
		return jsonResponse(500, map[string]string{"error": "Token exchange failed"}), nil
	}

	rawToken := token.AccessToken
	parsedToken, _, err := new(jwt.Parser).ParseUnverified(rawToken, jwt.MapClaims{})
	if err != nil {
		log.Printf("Failed to parse JWT token: %v", err)
		return jsonResponse(500, map[string]string{"error": "JWT parse failed"}), nil
	}

	claims := parsedToken.Claims.(jwt.MapClaims)

	return jsonResponse(200, map[string]interface{}{
		"access_token":  token.AccessToken,
		"refresh_token": token.RefreshToken,
		"jwt_claims":    claims,
	}), nil
}

func main() {
	log.Println("Lambda starting up (production)")
	lambda.Start(handler)
}
