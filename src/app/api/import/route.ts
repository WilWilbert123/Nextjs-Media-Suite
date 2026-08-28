import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 });
  }

  // Explicitly block youtube links to avoid user confusion since DRM blocks them
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return NextResponse.json(
      { error: "YouTube URLs are not supported due to DRM and Bot protection. Please paste a direct link to an MP4 or GIF file instead." },
      { status: 400 }
    );
  }

  try {
    // Direct URL fetch (e.g. standard MP4 or Image URL)
    // We add a standard User-Agent so CDNs (like Wikimedia) don't block us with 429 Too Many Requests
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*"
      }
    });
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.statusText}` }, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    
    // Validate that we actually downloaded media, not an HTML error page or Captcha
    if (contentType.includes("text/html") || (!contentType.includes("video") && !contentType.includes("image") && !contentType.includes("octet-stream"))) {
      return NextResponse.json({ error: `The provided URL returned a webpage (${contentType}) instead of a direct media file. Please provide a direct link to an MP4 or GIF.` }, { status: 400 });
    }

    const contentDisposition = response.headers.get("content-disposition");
    
    // Create headers for the proxied response
    const headers = new Headers({
      "Content-Type": contentType,
    });
    
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    } else {
      const fileName = url.split('/').pop()?.split('?')[0] || "downloaded_file";
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
    }

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });

  } catch (error: any) {
    console.error("Import API Error:", error);
    
    let message = error.message || "Failed to process the URL";
    
    if (message.includes("playable formats") || message.includes("Sign in to confirm your age")) {
      message = "YouTube blocked the download of this video (likely due to age restriction, copyright music, or anti-bot protection). Please try a different video or use a direct MP4 link.";
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
