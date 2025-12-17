import Image from "next/image";
import Link from "next/link";

export default function AuthorBioBox({ author }) {
  if (!author) return null;

  const name = author?.name || "Editorial Team";
  const role = author?.role || "Contributor";
  const slug = author?.slug || null;
  const imageUrl = author?.imageUrl || null;

  // ✅ Try common bio fields (use whatever your DB/API provides)
  const bio =
    author?.bio ||
    author?.bioText ||
    author?.about ||
    author?.description ||
    author?.summary ||
    "";

  if (!bio) return null; // If no bio exists, don’t show the box.

  return (
    <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-100">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name}
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-extrabold text-slate-500">
                {name.charAt(0)}
              </span>
            )}
          </div>

          <div className="sm:hidden">
            {slug ? (
              <Link
                href={`/authors/${slug}`}
                className="text-base font-bold text-slate-900 hover:underline"
              >
                {name}
              </Link>
            ) : (
              <div className="text-base font-bold text-slate-900">{name}</div>
            )}
            <div className="text-sm text-slate-500">{role}</div>
          </div>
        </div>

        <div className="flex-1">
          <div className="hidden sm:block">
            {slug ? (
              <Link
                href={`/authors/${slug}`}
                className="text-lg font-bold text-slate-900 hover:underline"
              >
                {name}
              </Link>
            ) : (
              <div className="text-lg font-bold text-slate-900">{name}</div>
            )}
            <div className="mt-1 text-sm text-slate-500">{role}</div>
          </div>

          <div className="mt-4 text-sm leading-relaxed text-slate-700">
            {bio}
          </div>

          {slug && (
            <div className="mt-4">
              <Link
                href={`/authors/${slug}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
              >
                View author profile
                <span aria-hidden>→</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
