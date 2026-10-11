/** Shows one founder site inside this site (D388). */
export function EmbeddedSite({ title, src }: { title: string; src: string }) {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="sr-only">{title}</h1>
      <iframe
        title={title}
        src={src}
        className="min-h-[70vh] w-full flex-1 border-0"
      />
    </main>
  );
}
