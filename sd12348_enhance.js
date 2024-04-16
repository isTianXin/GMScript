// ==UserScript==
// @name         sd12348 增强
// @namespace    https://github.com/isTianXin/GMScript/
// @version      1.0.0
// @description  山东省行政执法人员培训学习云平台增强：1.播放完成自动跳转下一个视频
// @author       sancunguangyin
// @match        *://zfpx.sd12348.gov.cn/student/VideoDetails?*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

'use strict';

/**
 * 脚本运行间隔时间
 */
const SCRIPT_RUN_INTERVEL_SECONDS = 12;

/**
 * 脚本运行时间(24小时制 0 ~ 23)
 * 要运行到 0 点就填比 23 大的数
 *
 */
const HOUR_START = 9;
const HOUR_END = 22;

const DEBUG = true;

/**
 * 静音视频
 */
const SHOULD_MUTE_VIDEO = true;

/**
 * 已经播放完成的视频，标题左边会加入一个对号
 */
const VIDEO_FINISHED_SYMBOL = "√";

/**
 * {URLSearchParams}
 */
let query = null;
let courseName = null;

let log = (...args) => {
    DEBUG && console.log(args);
}
/**
 *
 */
let prepare = () => {
    query = new URLSearchParams(window.location.search);
    courseName = initCurrentCourseName();
}

let initCurrentCourseName = () => {
    let name = getPlayingVideoItemInList().innerText;
    if (name.startsWith(VIDEO_FINISHED_SYMBOL)) {
        name = name.slice(VIDEO_FINISHED_SYMBOL.length);
    }
    return name;
}

let getCurrentVideoID = () => {
    log(query);
    return query?.get("id") || null;
}

let getFinishedCacheKey = () => {
    return `VID:${getCurrentVideoID()}:NAME:${courseName}`;
}

/**
 * 将当前视频标记为播放完成
 */
let markCurrentVideoHasFinished = () => {
    GM_setValue(getFinishedCacheKey(), 1);
}

/**
 * 获取视频控件
 */
let getVideoElement = () => {
    return document.querySelector("video");
}

/**
 * 获取视频播放按钮
 */
let getPlayButton = () => {
    return document.querySelector(".prism-big-play-btn");
}

/**
 * 获取列表中正在播放的视频
 */
let getPlayingVideoItemInList = () => {
    return document.querySelector("div.list_title.disabled.playTitle");
}

/**
 * 获取列表中正在播放视频的下一个
 */
let getNextVideoItemInList = () => {
    return getPlayingVideoItemInList().parentNode.nextSibling;
}


/**
 * 当前视频播放是否完毕
 * @returns boolean
 */
let isCurrentVideoFinish = () => {
    if (isVideoFinishedAccordingToVideoMark()) {
        log('video mark');
        return true;
    }
    if (isVideoFinishedAccordingToVideoElementState()) {
        log('state');
        return true;
    }
    return false;
}
/**
 * 根据视频播放时间
 * @returns {boolean}
 */
let isVideoFinishedAccordingToVideoElementState = () => {
    //判断控件状态
    let videoEnded = getVideoElement().ended;
    if (videoEnded) {
        markCurrentVideoHasFinished();
        return true;
    }
    return false;
}
/**
 * 根据视频播放时间
 * @returns {boolean}
 */
let isVideoFinishedAccordingToDurationTime = () => {
    //播放时间 == 总时间
    let currentTime = document.querySelector(".current-time").innerText;
    let duration = document.querySelector(".duration").innerText;
    log(currentTime,duration);
    if (currentTime === '00:00') {
        return false;
    }
    if (currentTime >= duration) {
        markCurrentVideoHasFinished();
        return true;
    }
    return false;
}
/**
 * 根据播放列表视频前面是否有对号，判断是否已经播放完成
 * @returns {boolean}
 */
let isVideoFinishedAccordingToVideoMark = () => {
    // 最左边出现对号标识
    if (getPlayingVideoItemInList()?.innerText?.slice(0, 1) === VIDEO_FINISHED_SYMBOL) {
        markCurrentVideoHasFinished();
        return true;
    }
    return false;
}
/**
 * 当前视频是否学习过
 * @returns {boolean}
 */
let hasCurrentVideoFinished = () => {
    let value = GM_getValue(getFinishedCacheKey());
    log('Finished:' + value);
    if (value !== undefined && value !== null) {
        return true;
    }
    return isVideoFinishedAccordingToVideoMark();
}

let jumpToNext = () => {
    getNextVideoItemInList().firstChild.click();
}

/**
 * 播放视频
 */
let playVideo = () => {
    let video = getVideoElement();
    video.muted = SHOULD_MUTE_VIDEO;
    if (video.paused) {
        //点击播放
        getPlayButton().click();
    }
}

let playInOrder = () => {
    if (hasCurrentVideoFinished() || isCurrentVideoFinish()) {
        jumpToNext();
    }
    playVideo();
}

/**
 * 是否应该播放
 * @returns {Boolean}
 */
let shouldPlay = () => {
    let hour = new Date().getHours();
    return HOUR_START <= hour && hour < HOUR_END;
}

let start = () => {
    if (!shouldPlay()) {
        return;
    }
    prepare();
    playInOrder();
}

let intervalStart = (timeout) => {
    window.setInterval(start, timeout);
}
intervalStart(SCRIPT_RUN_INTERVEL_SECONDS * 1000);
