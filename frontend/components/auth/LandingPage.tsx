"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const LandingPage: React.FC = () => {
  const router = useRouter();
  const { user, loading, loginOAuth, loginWithEmailPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"info" | "password">("info");
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <main className="flex-1 flex">
        <div className="w-1/2 flex items-center justify-center">
          <div className="relative w-full h-full">
            <Image src="/hamkke.svg" alt="Hamkke Logo" fill className="object-contain" priority />
          </div>
        </div>

        <div className="w-1/2 flex items-center">
          <div className="max-w-md">
            <h1 className="text-6xl font-bold mb-4">Better Together.</h1>
            <h2 className="text-3xl mb-8">Join Hamkke today.</h2>

            <div className="space-y-4 px-8">
            {step === "info" ? (
            <>
              {mode === "signup" && (
                <div className="flex gap-4">
                  <div className="flex-grow">
                    <div className="pb-2 font-sans font-semibold text-sm">First name</div>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Your first name"
                      className="w-full px-2 py-2 pl-3 bg-background border border-gray-500 placeholder-gray-400 focus:border-red-900 text-white outline-none rounded"
                    />
                  </div>
                  <div className="flex-grow">
                    <div className="pb-2 font-sans font-semibold text-sm">Last name</div>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Your last name"
                      className="w-full px-2 py-2 pl-3 bg-background border border-gray-500 placeholder-gray-400 focus:border-red-900 text-white outline-none rounded"
                    />
                  </div>
                </div>
              )}
              <div className="mt-4">
                <div className="pb-2 font-sans font-semibold text-sm">Email</div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full px-2 py-2 pl-3 bg-background border border-gray-500 placeholder-gray-400 focus:border-red-900 text-white outline-none rounded"
                />
              </div>

              <button
                onClick={() => setStep("password")}
                className="mt-4 w-full border font-semibold border-gray-500 text-[#e9e9e9] rounded py-2 px-4 bg-white text-black hover:bg-gray-200"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              {mode === "signup" && (
                <>
                  {/* <div className="font-sans font-semibold text-sm">Name</div>
                  <div className="text-gray-400 mb-2">{firstName} {lastName}</div> */}
                </>
              )}
              <div className="font-sans font-semibold text-sm">Email</div>
              <div className="text-gray-400 mb-4">{email}</div>
              <div className="font-sans font-semibold text-sm">Password</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-2 py-2 pl-3 bg-background border border-gray-500 placeholder-gray-400 focus:border-red-900 text-white outline-none rounded"
              />

            <button
              onClick={async () => {
                try {
                  if (mode === "signup") {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/signup`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email,
                        password,
                        firstName,
                        lastName,
                      }),
                    });

                    const data = await res.json();

                    if (!res.ok) {
                      throw new Error(data.error || "Signup failed");
                    }

                    alert("Signup successful! Please check your email to confirm.");
                    setMode("login");
                    setStep("info");
                  } else {
                    await loginWithEmailPassword(email, password);
                    router.push("/");
                  }
                } catch (err) {
                  const message =
                    err instanceof Error ? err.message : "Something went wrong";
                  console.error("Auth failed:", err);
                  alert(message);
                }
                
              }}
              className="mt-4 w-full border font-semibold border-gray-500 text-[#e9e9e9] rounded py-2 px-4 bg-[#360808]/70 hover:bg-[#eeeeee] hover:text-black"
>
  {mode === "signup" ? "Create Account" : "Sign in"}
</button>


              <div className="flex justify-between text-sm mt-2">
                <span
                  onClick={() => setStep("info")}
                  className="text-gray-500 underline cursor-pointer hover:text-gray-300"
                >
                  ← Go back
                </span>
                {mode === "login" && (
                  <span className="text-gray-500 underline cursor-pointer hover:text-gray-300">
                    Forgot your password?
                  </span>
                )}
              </div>
            </>
          )}

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-600"></div>
                <span>or</span>
                <div className="flex-1 h-px bg-gray-600"></div>
              </div>

              <button
                onClick={() => loginOAuth("Google")}
                className="w-full bg-background border border-gray-500 text-white font-semibold rounded py-2 px-4 flex items-center justify-center gap-2"
                type="button"
              >
                <div className="relative w-5 h-5">
                  <Image src="/images/google.png" alt="Google" fill className="object-contain" />
                </div>
                Continue with Google
              </button>

              <button
                onClick={() => loginOAuth("Apple")}
                className="w-full bg-background border border-gray-500 text-white font-semibold rounded py-2 px-4 flex items-center justify-center gap-2"
                type="button"
              >
                <div className="relative w-5 h-5">
                  <Image src="/images/apple_white.svg" alt="Apple" fill className="object-contain" />
                </div>
                Continue with Apple
              </button>

              <div className="flex justify-center items-center">
              <button
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setStep("info");
                }}
                className="text-gray-500 flex justify-center items-center"
              >
                {mode === "login" ? "Don’t have an account?" : "Already have an account?"}
                <span className="text-[#dddddd]/70 ml-2 underline">
                  {mode === "login" ? "Sign up" : "Sign in"}
                </span>
              </button>
            </div>

            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 border-t border-gray-800">
        <nav className="flex flex-wrap gap-4 text-sm text-gray-500">
          <a href="#" className="hover:underline">About</a>
          <a href="#" className="hover:underline">Help Center</a>
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Cookie Policy</a>
          <a href="#" className="hover:underline">Accessibility</a>
          <a href="#" className="hover:underline">Advertising</a>
          <a href="#" className="hover:underline">Marketing</a>
          <span>© 2025 Hamkke Corp.</span>
        </nav>
      </footer>
    </div>
  );
};

export default LandingPage;
