// ==UserScript==
// @name         AvLibrary Helper
// @namespace    http://tampermonkey.net/
// @description  AvLibrary Helper
// @author       tianxin
// @match        *://www.google.com/*
// @grant        GM_xmlhttpRequest
// @version      1.0
// @run-at       document-end
// @connect      hpjav.tv
// @connect      supjav.com
// @connect      av-wiki.net
// @connect      mgstage.com
// ==/UserScript==

const HOSTNAME_AVWIKI = 'av-wiki';
const HOSTNAME_MGSTAGE = 'mgstage';

class OnlineVideoDetail {
    #link = '';
    #tags = [];
    #name = '';
    setName(name) {
        this.#name = name;
        return this;
    }
    name() {
        return this.#name;
    }
    setLink(link) {
        this.#link = link;
        return this;
    }
    link() {
        return this.#link;
    }
    setTags(tags) {
        this.#tags = tags;
    }
    tags() {
        return this.#tags;
    }
}
class BaseVideoDetail {
    #casts = [];
    #releaseDate = null;
    #detailLinks = null;
    setReleaseDate(releaseDate) {
        this.#releaseDate = releaseDate;
        return this;
    }
    releaseDate() {
        return this.#releaseDate;
    }
    setCasts(casts) {
        this.#casts = casts;
        return this;
    }
    casts() {
        return this.#casts;
    }
    setDetailLinks(detailLinks) {
        this.#detailLinks = detailLinks;
        return this;
    }
    detailLinks() {
        return this.#detailLinks;
    }
    detailLinkInfo() {
        let links = this.detailLinks();
        if (!links) {
            return [];
        }
        if (links[HOSTNAME_MGSTAGE]) {
            return links[HOSTNAME_MGSTAGE];
        }
        if (links[HOSTNAME_AVWIKI]) {
            return links[HOSTNAME_AVWIKI];
        }
        return [];
    }
}
class ExtendVideoDetail {
    #hostname = '';
    #name = '';
    #companyName = '';
    #labelName = '';
    #coverImg = '';
    #detailLink = '';
    #duaration = '';
    #tags = [];
    setHostname(hostname) {
        this.#hostname = hostname;
        return this;
    }
    hostname() {
        return this.#hostname;
    }
    setName(name) {
        this.#name = name;
        return this;
    }
    name() {
        return this.#name;
    }
    setCompanyName(companyName) {
        this.#companyName = companyName;
        return this;
    }
    companyName() {
        return this.#companyName;
    }
    setLabelName(labelName) {
        this.#labelName = labelName;
        return this;
    }
    labelName() {
        return this.#labelName;
    }
    setCoverImg(coverImg) {
        this.#coverImg = coverImg;
        return this;
    }
    coverImg() {
        return this.#coverImg;
    }
    setDetailLink(detailLink) {
        this.#detailLink = detailLink;
        return this;
    }
    detailLink() {
        return this.#detailLink;
    }
    setDuaration(duaration) {
        this.#duaration = duaration;
        return this;
    }
    duaration() {
        return this.#duaration;
    }
    setTags(tags) {
        this.#tags = tags;
        return this;
    }
    tags() {
        return this.#tags;
    }
}
/**
 * xhr
 * @param options 须满足 GM_xmlhttpRequest 参数
 */
let fetch = async (options) => {
    return new Promise((resolve, reject = (response, url = options.url) => {
        console.log(
            'Error getting ' + url + ' (' + response.status + ' ' + response.statusText + ')'
        );
    }) => {
        GM_xmlhttpRequest({
            onload(response) {
                if (response.status >= 200 && response.status < 400) {
                    resolve(response);
                } else {
                    reject(response);
                }
            },
            onerror(response) {
                reject(response);
            },
            ...options
        });
    });
};

let absoluteURL = (host, url) => {
    if (!url) {
        return "";
    }
    return host + url.replace(location.origin, '').replace(host, '');
}

let transferHTMLToDOM = (html) => {
    if (!html) {
        return null;
    }
    return new DOMParser().parseFromString(html, "text/html");
}

let fetchDOM = async (options) => {
    let response = await fetch(options);
    return transferHTMLToDOM(response?.responseText);
}

let trimBlank = (str) => {
    if (!str) {
        return "";
    }
    return str.replace(/\s/gm, "");
}

let trimLineBreak = (str) => {
    if (!str) {
        return "";
    }
    return str.replace(/(\r\n|\n|\r)/gm, "");
}

let trimBlankAndLineBreak = (str) => {
    return trimBlank(trimLineBreak(str));
}
//观看地址
const onlineWebsiteConfig = {
    hpjav: {
        name: "HPJAV",
        host: "https://www.hpjav.tv",
        searchConfig(args) {
            return {
                url: `${this.host}/tw/?s=${args.code}`,
                method: "GET"
            };
        },
        detailLink(item) {
            let url = item.querySelector("div.video-item > div.entry-title > a")?.href;
            return absoluteURL(this.host, url);
        },
        videoDetail(item) {
            detail = new OnlineVideoDetail();
            detail.setTags(Array.from(item.querySelectorAll("div.video-title.col-md-7 > div.video-countext-tags.col-md-12 > a"))
                ?.map(a => a.innerText))
            return detail;
        }

    },
    supjav: {
        name: "SUPJAV",
        host: "https://supjav.com",
        searchConfig(args) {
            return {
                url: `${this.host}/zh/?s=${args.code}`,
                method: "GET"
            };
        },
        detailLink(item) {
            return absoluteURL(this.host, item.querySelector("div.content > div.posts.clearfix > div > div > h3 > a")?.href);
        },
        videoDetail(item) {
            detail = new OnlineVideoDetail();
            detail.setTags(Array.from(item.querySelectorAll("div.content.content-padding > div.post-meta.clearfix > div.tags > a"))
                ?.map(a => a.innerText))
            return detail;
        }
    }
}

//基础信息
const baseWebsiteConfig = {
    [HOSTNAME_AVWIKI]: {
        name: "AV-WIKI",
        host: "https://av-wiki.net",
        searchConfig(args) {
            return {
                url: `${this.host}/?s=${args.code}`,
                method: "GET"
            }
        },
        videoDetail(item) {
            detail = new BaseVideoDetail();
            detail.setReleaseDate(
                item.querySelector("article > div > div.meta-contents > div > ul > li:nth-child(2)")?.innerText?.split("：")[1]
            ).setCasts(
                Array.from(item.querySelectorAll("div.clearfix.one-column.white > article > p > span > a"))?.map(a => a.innerText)
            ).setDetailLinks(
                Array.from(item.querySelectorAll("ul.link-wrapper > li > a")).map(a => {
                    return {
                        name: a.innerText,
                        link: a.href
                    }
                }).reduce((prev, cur) => {
                    let hostname = new URL(cur.link)?.hostname;
                    let splits = hostname.split(".");
                    //提取域名 www.hpjav.tv => hpjav, supjav.com => supjav
                    if (splits.length >= 1) {
                        hostname = splits.slice(-2).shift();
                    }
                    cur.hostname = hostname;
                    prev[hostname] = cur;
                    return prev;
                }, {})
            )
            return detail;
        },
    }
}

const extendWebsiteConfig = {
    [HOSTNAME_AVWIKI]: {
        name: "AV-WIKI",
        host: "https://av-wiki.net",
        videoDetail(item) {
            let detail = new ExtendVideoDetail();
            detail.setName(
                item.querySelector("#top > div.content > div > main > div > article > section > div.blockquote-like > p")?.innerText
            ).setCoverImg(
                item.querySelector("#top > div.content > div > main > div > article > header > div.article-thumbnail.text-center > a > img")?.src
            ).setCompanyName(
                item.querySelector("#top > div.content > div > main > div > article > section > dl > dd")
            )
            return detail;
        }
    },
    [HOSTNAME_MGSTAGE]: {
        name: "mgstage",
        host: "https://www.mgstage.com",
        videoDetail(item) {
            let detail = new ExtendVideoDetail();
            detail.setName(
                trimBlankAndLineBreak(item.querySelector("#center_column > div.common_detail_cover > h1")?.innerText)
            ).setCoverImg(
                item.querySelector("#EnlargeImage")?.href
            );
            let contents = Array.from(item.querySelectorAll("tr")).
                filter(tr => tr.querySelector("th")).
                map(tr => {
                    return {
                        header: tr.querySelector("th").innerText,
                        data: trimBlankAndLineBreak(tr.querySelector("td")?.innerText)
                    }
                }).reduce((prev, cur) => {
                    prev[cur.header] = cur.data;
                    return prev;
                }, {});
            detail.setCompanyName(contents['メーカー：'])
                .setDuaration(contents['収録時間：'])
                .setTags(contents['ジャンル：'].split(" "))
            return detail;
        }
    }
}

//基础信息
let fetchBaseVideoDetail = async (code, baseConfig) => {
    let baseHTML = await fetchDOM(baseConfig.searchConfig({ code: code }));
    return baseConfig.videoDetail(baseHTML);
}
let fetchBaseVideoDetails = async (code) => {
    return fetchBaseVideoDetail(code, baseWebsiteConfig[HOSTNAME_AVWIKI]);
}

// 观看地址
let fetchOnlineVideoDetail = async (code, onlineConfig) => {
    let searchHTML = await fetchDOM(onlineConfig.searchConfig({ code: code }));
    let detailLink = onlineConfig.detailLink(searchHTML);
    if (!detailLink) {
        return null;
    }
    let detailHTML = await fetchDOM({ url: detailLink, method: "GET" });
    let videoDetail = onlineConfig.videoDetail(detailHTML);
    videoDetail.setLink(detailLink).setName(onlineConfig.name);
    return videoDetail;
}
let fetchOnlineVideoDetails = async (code) => {
    let promises = Object.values(onlineWebsiteConfig).map(c => fetchOnlineVideoDetail(code, c))
    return await Promise.all(promises);
}

// 拓展信息
let fetchExtendVideoDetail = async (url, hostname) => {
    let config = extendWebsiteConfig[hostname];
    if (!config) {
        return null;
    }
    let html = await fetchDOM({ url: url, method: "GET" });
    let detail = config.videoDetail(html);
    if (!detail || !detail.name()) {
        return null;
    }
    detail.setDetailLink(url).setHostname(hostname);
    return detail;

}

let packageVideoDetail = (results) => {
    console.log(results);
}
// 获取视频信息
let fetchVideoDetailSeparately = async (code) => {
    let base = await fetchBaseVideoDetails(code);
    if (!base) {
        return null;
    }
    let detailLinkInfo = base.detailLinkInfo();
    return await Promise.all([
        fetchExtendVideoDetail(detailLinkInfo.link, detailLinkInfo.hostname),
        fetchOnlineVideoDetails(code)
    ]);
}

let fetchVideoDetail = async (code) => {
    let results = await fetchVideoDetailSeparately(code);
    packageVideoDetail(results);
}

let start = async () => {
    'use strict';
    let code = '200GANA-1738';
    await fetchVideoDetail(code);
}

await start();