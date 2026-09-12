import { describe, expect, it } from "vitest"
import { pickStopImagePage } from "./stop-image"

describe("pickStopImagePage", () => {
  it("picks the lowest-index page that has a thumbnail", () => {
    const result = pickStopImagePage(
      {
        "2": { index: 1, title: "Near Place", fullurl: "https://en.wikipedia.org/wiki/Near_Place" },
        "1": {
          index: 0,
          title: "Closest Place",
          thumbnail: { source: "https://upload.wikimedia.org/closest.jpg" },
          fullurl: "https://en.wikipedia.org/wiki/Closest_Place",
        },
      },
      "en.wikipedia.org",
    )
    expect(result).toEqual({
      url: "https://upload.wikimedia.org/closest.jpg",
      title: "Closest Place",
      pageUrl: "https://en.wikipedia.org/wiki/Closest_Place",
    })
  })

  it("skips pages without a thumbnail or title", () => {
    const result = pickStopImagePage(
      {
        "1": { index: 0, title: "No Photo" },
        "2": { index: 1, thumbnail: { source: "https://upload.wikimedia.org/untitled.jpg" } },
        "3": {
          index: 2,
          title: "With Photo",
          thumbnail: { source: "https://upload.wikimedia.org/photo.jpg" },
          fullurl: "https://en.wikipedia.org/wiki/With_Photo",
        },
      },
      "en.wikipedia.org",
    )
    expect(result?.title).toBe("With Photo")
  })

  it("falls back to a canonical page URL when fullurl is missing", () => {
    const result = pickStopImagePage(
      {
        "1": {
          index: 0,
          title: "Colosseo",
          thumbnail: { source: "https://upload.wikimedia.org/colosseo.jpg" },
        },
      },
      "it.wikipedia.org",
    )
    expect(result?.pageUrl).toBe("https://it.wikipedia.org/wiki/Colosseo")
  })

  it("returns null when no page has a thumbnail", () => {
    expect(pickStopImagePage({ "1": { index: 0, title: "No Photo" } }, "en.wikipedia.org")).toBeNull()
    expect(pickStopImagePage(undefined, "en.wikipedia.org")).toBeNull()
    expect(pickStopImagePage({}, "en.wikipedia.org")).toBeNull()
  })
})
