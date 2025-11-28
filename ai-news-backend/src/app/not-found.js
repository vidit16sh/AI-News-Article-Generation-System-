import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold text-slate-200">404</h1>
      <h2 className="mt-4 text-2xl font-bold text-slate-800">Page not found</h2>
      <p className="mt-2 max-w-md text-slate-500">
        Sorry, we couldn't find the news article or page you were looking for.
      </p>
      <Link 
        href="/"
        className="mt-8 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Return Home
      </Link>
    </div>
  );
}