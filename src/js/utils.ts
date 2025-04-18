import { Items } from "@browser/items";
import { Logger } from "@apis/logging";
import { SettingsAPI } from "@apis/settings";

interface UtilsInterface {
  items: Items;
  logger: Logger;
  settings: SettingsAPI;
}

class Utils implements UtilsInterface {
  items: Items;
  logger: Logger;
  settings: SettingsAPI;

  constructor() {
    this.items = new Items();
    this.logger = new Logger();
    this.settings = new SettingsAPI();
  }

  setFavicon(tabElement: HTMLElement, iframe: HTMLIFrameElement): void {
    iframe.addEventListener("load", async () => {
      try {
        if (!iframe.contentDocument) {
          console.error(
            "Unable to access iframe content due to cross-origin restrictions.",
          );
          return;
        }

        let favicon: HTMLLinkElement | null = null;
        const nodeList =
          iframe.contentDocument.querySelectorAll("link[rel~='icon']");

        for (let i = 0; i < nodeList.length; i++) {
          const relAttr = nodeList[i].getAttribute("rel");
          if (relAttr && relAttr.includes("icon")) {
            favicon = nodeList[i] as HTMLLinkElement;
            break;
          }
        }

        if (favicon) {
          let faviconUrl = favicon.href || favicon.getAttribute("href");
          const faviconImage = tabElement.querySelector(".tab-favicon");

          faviconUrl = await this.getFavicon(faviconUrl as string);

          if (faviconUrl && faviconImage) {
            faviconImage.setAttribute(
              "style",
              `background-image: url('${faviconUrl}');`,
            );
          } else {
            console.error("Favicon URL or favicon element is missing.");
          }
        } else {
          console.error(
            "No favicon link element found within the iframe document.",
          );
        }
      } catch (error) {
        console.error("An error occurred while setting the favicon:", error);
      }
    });
  }

  async getFavicon(url: string): Promise<string | null> {
    try {
      const googleFaviconUrl = `/internal/icons/${encodeURIComponent(url)}`;
      return googleFaviconUrl;
    } catch (error) {
      console.error("Error fetching favicon as data URL:", error);
      return null;
    }
  }

  processUrl(url: string): string | void {
    let js = "";
    if (url.startsWith("daydream://")) {
      const path = url.replace("daydream://", "");
      return `/internal/${path}`;
    } else if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("/") ||
      url.startsWith("data:")
    ) {
      return url;
    } else if (url.startsWith("javascript:")) {
      js = url.replace("javascript:", "");
      const iframe = document.querySelector(
        "iframe.active",
      ) as HTMLIFrameElement | null;
      if (iframe && iframe.contentWindow) {
        (iframe.contentWindow as any).eval(js);
      }
    } else {
      return `/internal/${url}`;
    }
  }

  getInternalURL(url: string): string {
    if (url.startsWith("/internal/")) {
      const path = url.replace("/internal/", "");
      return `daydream://${path}`;
    } else if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("daydream://") ||
      url.startsWith("data:") ||
      url.startsWith("javascript:") ||
      (url.startsWith("/") && !url.startsWith("/internal/"))
    ) {
      return url;
    } else {
      return `daydream://${url}`;
    }
  }

  navigate(url: string): void {
    const processedUrl = this.processUrl(url);
    if (processedUrl) {
      const iframe = this.items.iframeContainer?.querySelector(
        "iframe.active",
      ) as HTMLIFrameElement | null;
      if (iframe) {
        iframe.setAttribute("src", processedUrl);
        this.logger.createLog(`Navigated to: ${processedUrl}`);
      }
    }
  }

  closest(value: number, array: number[]): number {
    let closest = Infinity;
    let closestIndex = -1;

    array.forEach((v, i) => {
      if (Math.abs(value - v) < closest) {
        closest = Math.abs(value - v);
        closestIndex = i;
      }
    });

    return closestIndex;
  }

  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
  ): (...args: Parameters<T>) => void {
    let lastFunc: ReturnType<typeof setTimeout> | null = null;
    let lastRan: number | null = null;

    return function (...args: Parameters<T>) {
      if (!lastRan) {
        func(...args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc!);
        lastFunc = setTimeout(
          () => {
            if (Date.now() - lastRan! >= limit) {
              func(...args);
              lastRan = Date.now();
            }
          },
          limit - (Date.now() - lastRan!),
        );
      }
    };
  }
}

export { Utils };
