import { UserProfile } from '@clerk/nextjs';

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            User Profile
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings and security
          </p>
        </div>
        <UserProfile 
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
