// ==UserScript==
// @name         灯塔党建增强
// @namespace    https://github.com/isTianXin/GMScript/
// @version      1.1.1
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
 * 视频学习状态文字
 */
const STUDY_STATUS_TEXT_UNFINISHED = "未学习";
const STUDY_STATUS_TEXT_FINISHED = "已学习";
const STUDY_STATUS_TEXT_ONGOING = "学习中";
const STUDY_STATUS_TEXT_EXAM_NOT_PASS = "未通过考试";

/**
 * 是否有考试
 */
const HAS_EXAM_YES = "是";

/**
 * 脚本运行间隔时间
 */
const SCRIPT_RUN_INTERVEL_SECONDS = 12;

/**
 * 脚本运行时间(24小时制 0 ~ 23)
 * 要运行到 0 点就填比 23 大的数
 * 
 */
const HOUR_START = 8;
const HOUR_END = 23;

const DEBUG = true;

/**
 * 是否执行过 prepare()
 */
let prepared = false;
/**
 * 下一个视频
 * checked 是否获取过下一个视频下标
 * pageTurned 是否已翻页
 * shouldDelayClickNextVideo 是否延迟点击列表中的下一个视频
 * 翻页时，click 事件会调用接口，根据返回生成播放列表的下一页，但是 ui 的速度慢于 js 执行速度，经常会点到本页的第一个视频，因此此轮只翻页不切换视频，标记后下一轮再进行切换
 */
let nextVideoConfig = {
    videoIndex: null,
    checked: false,
    pageTurned: false,
    pageNum: 1,
    shouldDelayClickNextVideo: false,
};

/**
 * url 参数
 */
let query = null;

function log(...args) {
    DEBUG && console.log(args);
}

/**
 * 获取子节点为父节点的第几个元素
 * @param node
 * @returns
 */
function getChildIndex(node) {
    return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
}
/**
 * 视频对象
 * @returns video
 */
function videoElement() {
    return document.querySelector("video");
}
/**
 * 正在播放的视频
 * 获取的为底部暂停图标，无论视频有没有在播放，只要在当前页都能获取到
 * @returns
 */
function playingVideo() {
    return document.querySelector('div.suspended');
}
/**
 * 正在播放的视频所在的完整卡片
 * @returns
 */
function playingVideoCard(playing) {

    return (playing ?? playingVideo()).parentElement.parentElement;
}
/**
 * 正在播放的视频学习状态文字
 * @param {*} playingVideoCard
 * @returns
 */
function playingVideoStudyStateText(playingVideo) {
    return (playingVideo ?? playingVideoCard())?.querySelector("span.state-paused")?.innerText;
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

function setFirstVideoInPageAsNextVideo(key) {
    nextVideoConfig.videoIndex = 0;
    nextVideoConfig.checked = true;
    nextVideoConfig.pageNum = parseInt(sessionStorage.getItem('listPageNum'));
    GM_setValue(key, nextVideoConfig);
    log(key, nextVideoConfig);
}
/**
 * 阻止视频结束后进入考试
 */
function preventJumpToExamWhenVideoEnd() {
    // 添加 ended 事件，阻止自带的 ended 事件（结束后进入考试页面）
    videoElement().addEventListener("ended", e => {
        markCurrentVideoHasFinished();
        e.stopPropagation();
    },
        { capture: true }
    );
}
/**
 * 下一个视频
 * @returns
 */
function nextVideo() {

    // 取缓存
    let key = getNextVideoCacheKey();
    let cachedData = GM_getValue(key);
    log('CACHE:', key, cachedData);
    if (cachedData) {
        nextVideoConfig = cachedData;
    }
    // 判断缓存的数据是否获取过下标
    if (nextVideoConfig.checked) {
        return nextVideoConfig;
    }
    let playing = playingVideo();

    if (playing) {
        let next = getNextFromSibling(playing);

        //有下一个，说明不是本页最后一个，直接返回
        if (next) {
            nextVideoConfig.videoIndex = getChildIndex(next);
            nextVideoConfig.checked = true;
            nextVideoConfig.pageNum = sessionStorage.getItem('listPageNum');
            GM_setValue(key, nextVideoConfig);
            log(key, nextVideoConfig);
            return nextVideoConfig;
        }
        //如果已经翻过页，依然没有下一个，说明已经看完了
        if (nextVideoConfig.pageTurned) {
            return null;
        }
        log('The end', playing);
        let nextPage = nextPageButton();
        if (!nextPage) {
            log('Cant find next button');
            return null;
        }
        //最后一页
        if (nextPage.disabled) {
            log('Last page');
            return null;
        }
        //翻页
        log("before");
        //翻页触发事件调用接口，会把 listPageNum 写入 session，直接进来是没有这个字段的,放弃直接读取 listPageNum 的想法吧
        nextPage.click();
        log("after");
        nextVideoConfig.pageTurned = true;
        //翻页后本轮不切换为下一个视频
        nextVideoConfig.shouldDelayClickNextVideo = true;
        setFirstVideoInPageAsNextVideo(key);
        return nextVideoConfig;

    } else {
        /**
         * 获取不到播放按钮，说明此时已经翻页了
         *
         */
        //没有播放，并且没有翻页，异常情况
        if (!nextVideoConfig.pageTurned) {
            log('Unkonwn playing video');
            return null;
        }
        //从本页第一个开始
        setFirstVideoInPageAsNextVideo(key);
        return nextVideoConfig;
    }
}
/**
 * 跳转到下一个视频
 * @returns
 */
function jumpToNext() {
    let next = nextVideo();
    log('nextVideo', next);

    //播放下一个
    if (next?.pageNum) {
        sessionStorage.setItem('listPageNum', next.pageNum);
    }
    let videoIndex = next.videoIndex;
    let video = document.querySelector("div.bottom-list-warp > div.bjCourceList-wrap > div.left-right > div.course-list-warp").children[videoIndex];
    log('video', video);

    //是否延迟一轮
    if (next.shouldDelayClickNextVideo) {
        next.shouldDelayClickNextVideo = false;
        //写入缓存与 nextVideo 函数配合
        GM_setValue(getNextVideoCacheKey(), next);
        return;
    }
    //点击下一个频频
    video.firstElementChild.click();
}
/**
 * 获取url参数
 * @returns
 */
function getQuery() {
    return new URLSearchParams(location.hash?.split('?')[1])
}
function getFinishedCacheKey() {
    if (!query) {
        return null;
    }
    let courseId = query.get('courseId');
    let courceListId = query.get('courseListId');
    return 'CID:' + courseId + ':CLID:' + courceListId;
}
function getExamCacheKey() {
    if (!query) {
        return null;
    }
    return 'EXAM:CID:' + query.get('courseId');
}
function getNextVideoCacheKey() {
    if (!query) {
        return null;
    }
    return 'NEXT:CID:' + query.get('courseId');
}
/**
 * 将当前视频标记为播放完成
 */
function markCurrentVideoHasFinished() {
    GM_setValue(getFinishedCacheKey(), 1);
}
/**
 * 当前视频播放是否完毕
 * @returns boolean
 */
function isCurrentVideoFinish() {
    //是否出现重播按钮
    let replayButton = document.querySelector("div.vjs-control-bar > button.vjs-play-control.vjs-control.vjs-button.vjs-paused.vjs-ended");
    //播放完成标识
    if (replayButton !== null) {
        markCurrentVideoHasFinished();
        return true;
    }
    let videoEnded = videoElement().ended;
    if (videoEnded) {
        markCurrentVideoHasFinished();
        return true;
    }
    return false;
}
/**
 * 根据播放列表视频状态文字判断是否已经播放完成
 * @returns
 */
function isVideoFinishedAccordingToStudyStatusText() {
    log('State:' + playingVideoStudyStateText());
    if ([STUDY_STATUS_TEXT_FINISHED, STUDY_STATUS_TEXT_EXAM_NOT_PASS].includes(playingVideoStudyStateText())) {
        //翻页后 playing 获取不到，因此写入缓存使其在上一步就返回
        markCurrentVideoHasFinished();
        return true;
    }
    return false;
}
/**
 * 当前视频是否学习过
 * @returns
 */
function hasCurrentVideoFinished(playing) {
    let value = GM_getValue(getFinishedCacheKey());
    log('Finished:' + value);
    if (value !== undefined && value !== null) {
        return true;
    }
    return isVideoFinishedAccordingToStudyStatusText();
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
    return examText.innerText === HAS_EXAM_YES;
}
/**
 * 是否在考试页面
 * @returns
 */
function inExam() {
    if (!query) {
        return false;
    }
    return query.get("examId") !== null;
}
/**
 * 退出考试
 */
function exitExam() {
    if (query.get('studyStatus') == STUDY_STATUS_FINISHED) {
        //记录考试标识
        let key = getExamCacheKey();
        if (key) {
            GM_setValue(key, 1);
        }
    }
    log('EXIT FROM EXAM:' + query.get('examId'));
    document.querySelector("button.el-button.modelBtn.exitBtn.el-button--default.el-button--mini").click();
}
/**
 * 是否播放完成进入过考试页面
 * @returns
 */
function hasJumpToExamAfterFinish() {
    let value = GM_getValue(getExamCacheKey());
    log('EXAM:' + value);
    return value !== undefined && value !== null;
}
/**
 * 当前视频是否播放完成过
 * @returns
 */
function hasCurrentVideoStudied() {
    return hasCurrentVideoFinished();
}
/**
 * 播放按钮
 * @returns
 */
function playButton() {
    return document.querySelector("button.vjs-big-play-button");
}
/**
 * 顺序播放
 */
function playInOrder() {
    //已经播放过或者正好播放完成,跳到下一个
    if (hasCurrentVideoStudied() || isCurrentVideoFinish()) {
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
    query = getQuery();
    playInOrder();
}
function start() {
    if (!shouldPlay()) {
        return;
    }
    prepare();
    play();
}
/**
 * 预处理
 */
function prepare() {
    if (prepared) {
        return;
    }
    preventJumpToExamWhenVideoEnd();
    prepared = true;
}
function intervalStart(timeout) {
    window.setInterval(start, timeout);
}
intervalStart(SCRIPT_RUN_INTERVEL_SECONDS * 1000);