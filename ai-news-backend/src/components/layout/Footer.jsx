import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      {/* Footer content: 90% of viewport, capped at 1440px */}
      <div className="mx-auto w-[90vw] max-w-[1440px] px-2 py-6 text-xs sm:px-4 sm:text-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="font-semibold text-slate-800">VrajNews</div>
            <p className="max-w-xl text-slate-500">
              AI-powered crypto &amp; tech news — summarised, contextualized,
              and expanded into readable explainers.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-slate-500">
            <Link
              href="/terms"
              className="transition hover:text-slate-800 hover:underline"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              href="/privacy"
              className="transition hover:text-slate-800 hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/disclaimer"
              className="transition hover:text-slate-800 hover:underline"
            >
              Disclaimer
            </Link>
          </div>
        </div>

        <div className="mt-4 text-[0.7rem] text-slate-400">
          © {new Date().getFullYear()} VrajNews. AI-generated content may
          contain inaccuracies. Always verify with primary sources.
        </div>
      </div>
    </footer>
  );
}
