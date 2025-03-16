import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Khalid Albaih',
  description: 'Administration dashboard for managing donation data',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Admin Dashboard
            </h1>
            <nav className="flex space-x-4">
              <a 
                href="/admin/donations" 
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                Donations
              </a>
              <a 
                href="/" 
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                Back to Site
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main>
        <div className="py-4">
          {children}
        </div>
      </main>
    </div>
  );
}