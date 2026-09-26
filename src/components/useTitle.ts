import { useEffect } from "react";

/** Sets the tab title: "Technology · wireframe". Pass nothing for the home page. */
export function useTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} · wireframe` : "wireframe · Ring CAD from a plain description";
  }, [page]);
}
