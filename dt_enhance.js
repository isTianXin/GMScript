// ==UserScript==
// @name         灯塔党建增强
// @namespace    https://github.com/isTianXin/GMScript/
// @version      1.0
// @description  灯塔党建增强插件:自动连续播放，跳过答题
// @author       sancunguangyin
// @match        https://gbwlxy.dtdjzx.gov.cn/content
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

'use strict';

/**
 * 学习状态
 */
const STUDY_STATUS_INIT = 1;
const STUDY_STATUS_FINISHED = 2;

/**
 * 脚本运行时间(24小时制 0 ~ 23)
 */
const HOUR_START = 8;
const HOUR_END = 23;

/**
 * 下一个视频
 */
let nextVideoConfig = {
    video: null,
    checked: false,
    paged: false,
};
/**
 * 正在播放的视频
 * @returns 
 */
function playingVideo() {
    return document.querySelector('div.suspended');
}
/**
 * 播放列表翻页button
 */
function nextPageButton() {
    return document.querySelector("div.bottom-list-warp > div.bjCourceList-wrap > div.left-right > div.right > button");
}
/**
 * 播放列表第一个视频
 */
function firstVideo() {
    return document.querySelector("div.bottom-list-warp > div.bjCourceList-wrap > div.left-right > div.course-list-warp > div:nth-child(1)");
}
function getNextFromSibling(playing) {
    return playing.parentElement.parentElement.nextElementSibling;
}
function getNextFromFirst() {
    return firstVideo();
}
/**
 * 下一个视频
 * @returns 
 */
function nextVideo() {
    if (nextVideoConfig.checked) {
        return nextVideoConfig.video;
    }
    let playing = playingVideo();

    if (playing) {
        let next = getNextFromSibling(playing);
        if (next) {
            nextVideoConfig.video = next;
            nextVideoConfig.checked = true;
            return nextVideoConfig.video;
        } //翻页
        if (nextVideoConfig.paged) {
            return null;
        }
        console.log('The end', playing);
        let nextPage = nextPageButton();
        if (!nextPage) {
            console.log('Cant find right button');
            return null;
        }
        //最后一页
        if (nextPage.disabled) {
            console.log('Last page');
            return null;
        }
        //翻页
        nextPage.click();
        nextVideoConfig.paged = true;
        return null;

    } else {
        if (!nextVideoConfig.paged) {
            console.log('Unkonwn playing video');
            return null;
        }
        let next = getNextFromFirst();
        nextVideoConfig.video = next;
        nextVideoConfig.checked = true;
        return nextVideoConfig.video;
    }
}
/**
 * 初始化下一页配置
 */
function initNextVideoConfig() {
    nextVideoConfig.video = null;
    nextVideoConfig.checked = false;
}
/**
 * 跳转到下一个视频
 * @returns 
 */
function jumpToNext() {
    let next = nextVideo();
    initNextVideoConfig();
    console.log("Next Page", next);
    //播放下一个
    next.firstElementChild.click();
}
/**
 * 获取url参数
 * @returns 
 */
function getQuery() {
    return new URLSearchParams(location.hash?.split('?')[1])
}
function getFinishedCacheKey(query) {
    if (!query) {
        return null;
    }
    let courseId = query.get('courseId');
    let courceListId = query.get('courseListId');
    return 'CID:' + courseId + ':CLID:' + courceListId;
}
function getExamCacheKey(query) {
    if (!query) {
        return null;
    }
    return 'EXAM:CID:' + query.get('courseId');
}
/**
 * 当前视频播放是否完毕
 * @returns 
 */
function isCurrentVideoFinish(query) {
    //是否出现重播按钮
    let replayButton = document.querySelector("#vjs_video_420 > div.vjs-control-bar > button.vjs-play-control.vjs-control.vjs-button.vjs-paused.vjs-ended");
    //播放完成标识
    if (replayButton !== null) {
        GM_setValue(getFinishedCacheKey(query), 1);
    }
    return replayButton !== null;
}
/**
 * 当前视频是否学习过
 * @param {URLSearchParams} query 
 * @returns 
 */
function hasCurrentVideoFinished(query) {
    let value = GM_getValue(getFinishedCacheKey(query));
    console.log('Finished:' + value);
    return value !== undefined && value !== null;
}
/**
 * 是否有随堂测试
 * @returns 
 */
function hasExam() {
    let examText = document.querySelector("#domhtml > div.app-wrapper.hideSidebar.withoutAnimation.mobile > div > section > div > div:nth-child(2) > div.MainVideo.el-row > div.top-right-warp > div > div:nth-child(1) > div:nth-child(7) > div.titleContent");
    if (!examText) {
        return false;
    }
    return examText.innerText === '是';
}
/**
 * 是否在考试页面
 * @returns
 */
function inExam(query) {
    if (!query) {
        return false;
    }
    return query.get("examId") !== null;
}
/**
 * 退出考试
 * @param {} query 
 */
function exitExam(query) {
    if (query.get('studyStatus') == STUDY_STATUS_FINISHED) {
        //记录考试标识
        let key = getExamCacheKey(query);
        if (key) {
            GM_setValue(key, 1);
        }
    }
    console.log('EXIT FROM EXAM:' + query.get('examId'));
    document.querySelector("button.el-button.modelBtn.exitBtn.el-button--default.el-button--mini").click();
}
/**
 * 是否播放完成进入过考试页面
 * @param {URLSearchParams} query 
 * @returns 
 */
function hasJumpToExamAfterFinish(query) {
    let value = GM_getValue(getExamCacheKey(query));
    console.log('EXAM:' + value);
    return value !== undefined && value !== null;
}
/**
 * 当前视频是否播放完成过
 * @param {URLSearchParams} query 
 * @returns 
 */
function hasCurrentVideoStudied(query) {
    return hasCurrentVideoFinished(query) || hasJumpToExamAfterFinish(query);
}
/**
 * 播放按钮
 * @returns
 */
function playButton() {
    return document.querySelector("#vjs_video_420 > button");
}
/**
 * 顺序播放
 */
function orderPlay(query) {
    //提前获取下一个视频
    nextVideo();
    //已经播放过或者正好播放完成,跳到下一个
    if (hasCurrentVideoStudied(query) || isCurrentVideoFinish(query)) {
        jumpToNext();
    }
    //点击播放
    playButton().click();
}
/**
 * 是否应该播放
 * @returns {Boolean}
 */
function shouldPlay() {
    //相等视为全天
    if (HOUR_START === HOUR_END) {
        return true;
    }
    let hour = new Date().getHours();
    return HOUR_START <= hour && hour < HOUR_END;
}
/**
 * 开始
 */
function play() {
    let query = getQuery();
    //退出考试页面
    if (inExam(query)) {
        exitExam(query);
    }
    orderPlay(query);
}
function start() {
    if (!shouldPlay()) {
        return;
    }
    play();
}
function intervalStart(timeout) {
    window.setInterval(start, timeout);
}
intervalStart(60 * 1000);