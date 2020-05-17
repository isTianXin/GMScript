// ==UserScript==
// @name         优书网小工具
// @namespace    https://github.com/isTianXin/GMScript
// @description  优书网小工具集合
// @require      http://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.js
// @author       tianxin
// @match        *://www.yousuu.com/book/*
// @version      1.0
// @run-at       document-end
// ==/UserScript==

/**
 * 链接来源的相关配置
 */
const linkSourceConfig = {
    'baike': {
        name: 'baike',
        siteName: '百度百科',
        link(info) {
            return 'https://baike.baidu.com/search?word=' + info.bookName;
        },
    }
}

/**
 * 优书网相关工具
 */
const yousuuTools = {
    bookName() {
        return document.querySelector('div.book-info-wrap>div.book-info-detail>h1.book-name').innerText;
    },
    bookAuthor() {
        return document.querySelector('div.book-info-wrap>div.book-info-detail>p.book-author>a').innerText;
    },
}

let _utils = {};
/**
 * 插入链接前的准备
 */
let prepareInsertLinks = () => {
    //获取dataV的值
    let node = Array.from(document.querySelectorAll('div.common-card-layout.main-left-header')).pop();
    let dataV = node.outerHTML.match(/data-v-(\w+)/g);
    _utils.dataV = dataV;
    //插入容器
    let content = `<div ${dataV[0]}="" class="common-card-layout main-left-header" id="gm-insert-link-box" style="display: none">
        <div ${dataV[1]}="" ${dataV[2]}="" class="tabs" id="gm-insert-link-content"></div></div>`;
    node.insertAdjacentHTML('beforebegin', content);
}
/**
 * 插入一条下载链接
 * @param {Object} info 
 */
let insertLink = (info) => {
    let obj = document.querySelector('#gm-insert-link-content');
    let item = '';
    //如果第一次插入,则显示父容器，同时插入标识
    if (obj.parentElement.style.display === 'none') {
        obj.parentElement.setAttribute('style', 'display:run-in');
        item = `<label ${_utils.dataV[3]}="" class="tab current">链接</label>`;
    }
    item += `<label ${_utils.dataV[3]}="" class="tab"><a href="${info.link}" target="_blank">${info.siteName}</a></label>`;
    obj.insertAdjacentHTML('beforeend', item);
}

/**
 * 从来源处解析并插入链接
 * @param {String} site 
 * @param {Object} bookInfo 
 */
let insertLinkFromSource = async (site, bookInfo) => {
    let siteConfig = linkSourceConfig[site];
    let link = siteConfig.link(bookInfo);
    insertLink({ link: link, siteName: siteConfig.siteName });
}
/**
 * 
 * 插入下载链接
 * @param {String} hostname 
 */
let insertLinks = async () => {
    let bookName = yousuuTools.bookName();
    let bookAuthor = yousuuTools.bookAuthor();
    if (!bookName || !bookAuthor) {
        return;
    }
    let bookInfo = { bookName: bookName, bookAuthor: bookAuthor };
    prepareInsertLinks();
    let promises = Object.keys(linkSourceConfig).map((site) => insertLinkFromSource(site, bookInfo).catch(e => console.log(e)));
    await Promise.all(promises);
}

/**
 * 执行脚本
 */
let start = () => {
    'use strict';
    //插入各种链接
    insertLinks();
}

/**
 * 延时执行脚本
 * @param {integer} interval 
 */
let startWithInterval = (interval) => {
    window.setTimeout(start, interval);
}

startWithInterval(1000);