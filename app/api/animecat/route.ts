import { NextRequest } from "next/server";
import * as scraperSamehadaku from "../../../lib/animecat";
import * as scraperOtakudesu from "../../../lib/otakudesu";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "terbaru";
  const server = searchParams.get("server") || "1";
  const scraper = server === "2" ? scraperOtakudesu : scraperSamehadaku;

  try {
    switch (action) {
      case "terbaru": {
        const page = parseInt(searchParams.get("page") || "1");
        const data = await scraper.getTerbaru(page);
        return Response.json(data);
      }
      case "populer": {
        const data = await scraper.getPopuler();
        return Response.json(data);
      }
      case "search": {
        const q = searchParams.get("q") || "";
        const page = parseInt(searchParams.get("page") || "1");
        if (!q.trim()) return Response.json([]);
        const data = await scraper.searchAnime(q, page);
        return Response.json(data);
      }
      case "daftar": {
        const page = parseInt(searchParams.get("page") || "1");
        const order = searchParams.get("order") || "latest";
        const genre = searchParams.get("genre") || undefined;
        const data = await scraper.getDaftarAnime({ page, order, genre });
        return Response.json(data);
      }
      case "detail": {
        const slug = searchParams.get("slug") || "";
        if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
        const data = await scraper.getDetail(slug);
        if (!data) return Response.json({ error: "not found" }, { status: 404 });
        return Response.json(data);
      }
      case "episode": {
        const slug = searchParams.get("slug") || "";
        if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
        const data = await scraper.getEpisode(slug);
        if (!data) return Response.json({ error: "not found" }, { status: 404 });
        return Response.json(data);
      }
      case "genres": {
        const data = scraper.getGenres();
        return Response.json(data);
      }
      default:
        return Response.json({ error: "invalid action" }, { status: 400 });
    }
  } catch (e: any) {
    return Response.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}