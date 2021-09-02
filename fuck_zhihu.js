// ==UserScript==
// @name         Fuck ZhiHu
// @namespace    https://github.com/isTianXin/GMScript/
// @version      1.1
// @description  去除知乎中的令人不爽的内容
// @author       sancunguangyin
// @match        https://www.zhihu.com/question/*
// @match        https://www.zhihu.com
// @run-at       document-end
// ==/UserScript==

'use strict';

/**
 * 去除答案列表会员专享
 */
let removeVipContent = () => {
    Array.from(document.querySelectorAll("div.ContentItem.AnswerItem > div.KfeCollection-AnswerTopCard-Container")).forEach((item) => {
        item.parentElement.parentElement.remove();
    });
};

/**
 * 去除推荐页视频
 */
let removeRecommendVideo = () => {
    Array.from(document.querySelectorAll("div.Feed > div.ContentItem.ZVideoItem")).forEach((item) => {
        item.parentElement.parentElement.remove();
    });
};

/**
 * 去除推荐页混合视频的回答
 */
let removeRecommendMixedVideo = () => {
    Array.from(document.querySelectorAll("div.RichContent.is-collapsed > div.RichContent-cover > svg")).forEach((item) => {
        item.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.remove();
    });
}

let start = () => {
    removeRecommendVideo();
    removeRecommendMixedVideo();
    removeVipContent();
};

start();

window.onscroll = () => {
    start();
};
