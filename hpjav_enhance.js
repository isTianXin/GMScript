// ==UserScript==
// @name         HPJAV增强
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  HPJAV增强
// @author       You
// @match        *://hpjav.tv/*
// @grant        GM_openInTab
// @run-at       document-end
// ==/UserScript==

'use strict';

const OPEN_ALL_TORRENT_LINKS_BUTTON = "openAllLinks";

let getTorrentFunkLink = (key) => {
    return `https://www.torrentfunk.com/all/torrents/${key}.html`;
}
let replaceDateTextWithTorrentFunkLink = (card) => {
    if (!card) {
        return;
    }
    let name = card.querySelector("a").innerText.split(" ")[0];
    if (!name) {
        return;
    }
    let torrentFunkLink = getTorrentFunkLink(name);
    let date = card.lastChild.wholeText;
    card.lastChild.remove();
    let jumpLink = `<a href=${torrentFunkLink} target="_blank">${date}</a>`;
    card.insertAdjacentHTML("beforeend", jumpLink);
}
let insertTorrentFunkLink = () => {
    let cards = Array.from(document.querySelectorAll("#ajax-fax > div > div.entry-title"));
    if (!cards) {
        return;
    }
    cards.forEach(replaceDateTextWithTorrentFunkLink);
}
let openAllTorrentFunkLinks = () => {
    Array.from(document.querySelectorAll("#ajax-fax > div > div.entry-title > a:nth-child(1)"))
        .map(item => item.innerText.split(" ")[0])
        .map(getTorrentFunkLink)
        .forEach(
            item => {
                if (!item) {
                    return;
                }
                setTimeout(() => {
                    GM_openInTab(item, { insert: false });
                }, 50);
            }
        );
}
let insertOpenAllButton = () => {
    let buttons = document.querySelector("body > section > div > div > div.category-count > span");
    let btn = `<a class="btn btn-sm btn-default" id="${OPEN_ALL_TORRENT_LINKS_BUTTON}" rel="nofollow">Open All Torrent Links</a>`;
    buttons.insertAdjacentHTML("afterbegin", btn);
}
let start = () => {
    //插入按钮
    insertTorrentFunkLink();
    insertOpenAllButton();
}
/**
 * 延时执行脚本
 * @param {integer} interval
 */
let startWithInterval = (interval) => {
    window.setTimeout(start, interval);
}

startWithInterval(1000);

document.onclick = e => {
    //搜索全部区县 onclick
    if (e.target.id === OPEN_ALL_TORRENT_LINKS_BUTTON) {
        let clicked = false;
        if (!clicked) {
            openAllTorrentFunkLinks();
            clicked = true;
        }
        setTimeout(() => clicked = false, 1000);
    }
};

