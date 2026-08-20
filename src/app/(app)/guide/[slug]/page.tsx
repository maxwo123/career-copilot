import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DOCS } from "../docs";

export default async function GuideDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOCS.find((d) => d.slug === slug);
  if (!doc) notFound();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;
  const token = process.env.MCP_TOKEN ?? "<MCP_TOKEN>";
  const connectorUrl = `${origin}/api/mcp/${token}`;

  return (
    <article>
      <div className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
        {doc.group}
      </div>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-900">
        {doc.title}
      </h1>
      <p className="mt-2 mb-6 text-sm leading-relaxed text-stone-500">
        {doc.description}
      </p>
      <doc.Body origin={origin} token={token} connectorUrl={connectorUrl} />
    </article>
  );
}
