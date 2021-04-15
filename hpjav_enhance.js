// ==UserScript==
// @name         HPJAV Enhance
// @namespace    https://github.com/isTianXin/GMScript/
// @version      1.0
// @description  HPJAV Enhance
// @author       You
// @match        *://hpjav.tv/*
// @grant        GM_openInTab
// @grant        GM_info
// @run-at       document-end
// ==/UserScript==

'use strict';

const OPEN_ALL_TORRENT_LINKS_BUTTON = "openAllLinks";

const SCRIPT_HANDLER_TAMPERMONKEY = 'tampermonkey';

let isTampermonkey = () => {
    return (GM_info || { scriptHandler: '' }).scriptHandler.toLowerCase() === SCRIPT_HANDLER_TAMPERMONKEY;
}

let getAdaptivedDocument = () => {
    //Tampermonkey will get first iframe, may be a bug
    if (isTampermonkey()) {
        return window.parent.document;
    }
    return window.document;
}

let adaptivedDocument = getAdaptivedDocument();

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
    let cards = Array.from(adaptivedDocument.querySelectorAll("#ajax-fax > div > div.entry-title"));
    if (!cards) {
        return;
    }
    cards.forEach(replaceDateTextWithTorrentFunkLink);
}
let openAllTorrentFunkLinks = () => {
    Array.from(adaptivedDocument.querySelectorAll("#ajax-fax > div > div.entry-title > a:nth-child(1)"))
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
    let buttons = adaptivedDocument.querySelector("body > section > div > div > div.category-count > span");
    let btn = `<a class="btn btn-sm btn-default" id="${OPEN_ALL_TORRENT_LINKS_BUTTON}" rel="nofollow">Open All Torrent Links</a>`;
    buttons.insertAdjacentHTML("afterbegin", btn);
}
let start = () => {
    insertTorrentFunkLink();
    insertOpenAllButton();
}
/**
 * @param {integer} interval
 */
let startWithInterval = (interval) => {
    window.setTimeout(start, interval);
}

startWithInterval(1000);

adaptivedDocument.onclick = e => {
    //openAll onclick
    if (e.target.id === OPEN_ALL_TORRENT_LINKS_BUTTON) {
        let clicked = false;
        if (!clicked) {
            openAllTorrentFunkLinks();
            clicked = true;
        }
        setTimeout(() => clicked = false, 1000);
    }
};

