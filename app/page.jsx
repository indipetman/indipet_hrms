import fs from "node:fs";
import path from "node:path";
import PrototypeRuntime from "@/components/PrototypeRuntime";

export const dynamic = "force-static";

export default function HomePage() {
  const markup = fs.readFileSync(
    path.join(process.cwd(), "src", "prototype", "hrms-markup.html"),
    "utf8"
  );

  return (
    <>
      <div
        id="hrms-prototype-root"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: markup }}
      />
      <PrototypeRuntime />
    </>
  );
}
