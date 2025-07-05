import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome Back
          </h1>
          <p className="mt-2 text-gray-600">
            Sign in to your Agentic RAG Chat account
          </p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
            }
          }}
        />
      </div>
    </div>
  );
}
