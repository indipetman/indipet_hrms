"use client";

import { useEffect } from "react";
import { createIcons, icons } from "lucide";
import { hrmsApi } from "@/src/lib/hrms-api";

export default function PrototypeRuntime() {
  useEffect(() => {
    window.lucide = {
      createIcons: () => createIcons({ icons })
    };
    window.IndipetHRMS = {
      api: hrmsApi,
      dataMode: process.env.NEXT_PUBLIC_HRMS_DATA_MODE || "mock"
    };

    if (document.querySelector('script[data-indipet-runtime="true"]')) return;

    const script = document.createElement("script");
    script.src = "/hrms-runtime.js";
    script.async = false;
    script.dataset.indipetRuntime = "true";
    document.body.appendChild(script);
  }, []);

  return null;
}
