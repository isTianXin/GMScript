// ==UserScript==
// @name         优书网 <=> 知轩藏书
// @namespace    http://tampermonkey.net/
// @description  [知轩藏书/早安电子书/书荒网/柚子书]添加优书网评分和直链，[优书网/柚子书]书籍详情页添加[知轩藏书/早安电子书/龙凤互联/书荒网]下载链接
// @require      http://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.js
// @require      https://greasyfork.org/scripts/40003-pajhome-md5-min/code/PajHome-MD5-min.js
// @require      https://cdn.jsdelivr.net/npm/gbk.js@0.3.0/dist/gbk.min.js
// @require https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js
// @author       tianxin
// @match        *://zxcs.me/sort/*
// @match        *://zxcs.me/post/*
// @match        *://zxcs.me/index.php?keyword=*
// @match        *://www.zxcs.me/sort/*
// @match        *://www.zxcs.me/post/*
// @match        *://www.zxcs.me/author/*
// @match        *://www.zxcs.me/tag/*
// @match        *://www.zxcs.me/index.php?keyword=*
// @match        *://www.yousuu.com/book/*
// @match        *://www.zadzs.com/txt/*
// @match        *://www.zadzs.com/plus/search.php?*
// @match        *://www.nordfxs.com/*
// @match        *://www.15huang.com/style/*.html
// @match        *://www.15huang.com/style/*
// @match        *://www.15huang.com/e/search/result/*
// @match        *://www.3uww.cc/down/*
// @match        *://www.3uww.cc/author/*
// @match        *://www.3uww.cc/soft*
// @match        *://www.3uww.cc/search.html
// @match        *://www.3uww.cc/top/*
// @match        *://www.xuanquge.com/down/*
// @match        *://www.xuanquge.com/author/*
// @match        *://www.xuanquge.com/soft*
// @match        *://www.xuanquge.com/search.html
// @match        *://www.xuanquge.com/top/*
// @match        *://www.ixuanquge.com/down/*
// @match        *://www.ixuanquge.com/author/*
// @match        *://www.ixuanquge.com/soft*
// @match        *://www.ixuanquge.com/search.html
// @match        *://www.ixuanquge.com/top/*
// @match        *://www.wanbentxt.com/*
// @match        *://www.yuzuhon.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @connect      www.yousuu.com
// @connect      www.zxcs.me
// @connect      www.zadzs.com
// @connect      www.nordfxs.com
// @connect      www.15huang.com
// @connect      www.3uww.cc
// @connect      www.mianhuatang.la
// @connect      zhannei.baidu.com
// @connect      www.ixdzs.com
// @connect      www.aixdzs.com
// @connect      www.xuanquge.com
// @connect      www.ixuanquge.com
// @connect      www.wanbentxt.com
// @connect      www.afs360.com
// @connect      www.auzw.com
// @connect      www.mianhuatang.cc
// @connect      www.balingtxt.com
// @connect      www.dushuxiaozi.com
// @connect      jingjiaocangshu.cn
// @connect      www.kenshula.com
// @version      0.7.2
// ==/UserScript==

/*================================================= 常量 ================================================*/
// 下载链接缓存时间，默认1天
const DOWNLOAD_EXPIRED_TIME = 86400 * 1000;
// 优书网评分缓存时间，默认1天
const SEARCH_EXPIRED_TIME = 86400 * 1000;
// 优书网最大搜索数目，默认5个
const MAX_SEARCH_NUM = 5;
// 下载链接类型 1:直接获取 2:解析请求bookLink的响应 3:解析原bookList的响应
const DOWNLOAD_TYPE_DIRECT = 1;
const DOWNLOAD_TYPE_FETCH = 2;
const DOWNLOAD_TYPE_PROCESS = 3;

//扩展名
const SCRIPT_HANDLER_TAMPERMONKEY = 'tampermonkey';

//需要排除的下载源
const DOWNLOAD_SITES_EXCEPTED = [
    'wanbentxt',
];

// 无法获取 ready 事件的网站
const SITES_WAIT_KEY_ELEMENT = {
    "www.yuzuhon.com": "#__layout > div > div.app-main > div > div.container > div.book-info-section",
}
/*======================================================================================================*/

/*================================================  类  ================================================*/
/**
 * local storage 存储,支持过期日期
 * 没必要用class,但就是想试试
 */
class Storage {

    /**
     * 构造函数
     */
    constructor() {
        if (this._checkStorageStatus) {
            this._localStorageStatus = true;
        }
    }
    /**
     * 检查 local storage 状态
     */
    _checkStorageStatus() {
        if (!window.localStorage) {
            return false;
        }
        try {
            window.localStorage.setItem('checkLocalStorage', '1203');
        } catch (error) {
            return false;
        }
        if (window.localStorage.getItem('checkLocalStorage') !== '1203') {
            return false;
        }
        window.localStorage.removeItem('checkLocalStorage');
        return true;
    }
    /**
     * 写入
     * @param key 键名
     * @param value 值
     */
    setValue(key, value) {
        if (this._localStorageStatus) {
            let data = JSON.stringify({ value: value, time: new Date().getTime() });
            try {
                window.localStorage.setItem(key, data);
            } catch (error) {
                if (error.name === 'QUOTA_EXCEEDED_ERR') { //存储已满，清空所有
                    window.localStorage.clear();
                }
                console.log(error);
            }
        }
    }

    /**
     * 读取
     * @param key 键名
     * @param expired 到期日
     */
    getValue(key, expired) {
        if (this._localStorageStatus) {
            let value = window.localStorage.getItem(key);
            if (value !== null) {
                let dataObj = JSON.parse(value);
                if (new Date().getTime() - dataObj.time > expired) {
                    window.localStorage.removeItem(key);
                    return null;
                } else {
                    return dataObj.value;
                }
            } else {
                return null;
            }
        }
        return null;
    }

    /**
     * 删除
     * @param key 键名
     */
    deleteValue(key) {
        if (this._localStorageStatus) {
            window.localStorage.removeItem(key);
        }
    }

    /**
     * 清除所有
     */
    clear() {
        if (this._localStorageStatus) {
            window.localStorage.clear();
        }
    }
}

//初始化存储
const storage = new Storage();
/*=====================================================================================================*/

/*===============================================  配置  ===============================================*/
/**
 * 评分来源网站配置
 */
const rateSiteSourceConfig = {
    'yousuu': {
        name: 'yousuu',
        //url前缀
        prefix: 'http://www.yousuu.com/book/',
        //请求参数
        request(bookInfo) {
            return {
                method: "GET",
                url: 'http://www.yousuu.com/api/search/?type=title&value=' + bookInfo.bookName,
            }
        },
        //解析
        parse(bookInfo, response) {
            let rateInfo = { score: 0, num: 0, url: '', match: false };
            let i = 0;
            for (let item of JSON.parse(response.responseText).data.books) {
                i++;
                //超过最大计数,退出
                if (i >= bookInfo.maxNum) {
                    break;
                }
                if (item.author == bookInfo.bookAuthor && item.title == bookInfo.bookName) {
                    rateInfo.score = Number.parseFloat(item.score / 10).toFixed(1);
                    rateInfo.num = Math.round(Number.parseFloat(item.scorerCount));
                    rateInfo.url = this.prefix + item.bookId;
                    rateInfo.match = true;
                    break;
                }
            }
            return rateInfo;
        }
    },
}

/**
 * 需添加评分网站的路由配置
 * 根据页面转换为 rateSiteTargetConfig 的键名
 */
const rateSiteTargetRoute = {
    'www.zxcs.me': () => {
        let tag = location.pathname.split('/')[1];
        let prefix = 'zxcs8.';
        if (tag === 'post') {
            return prefix + 'post';
        }
        if (['sort', 'tag', 'author'].includes(tag)) {
            return prefix + 'sort';
        }
        // 搜索页面
        if (location.pathname.includes('index.php')) {
            return prefix + 'sort';
        }
    },
    'www.zadzs.com': () => {
        let pathname = location.pathname;
        let prefix = 'zadzs.';
        if (pathname.includes('txt')) {
            return prefix + 'detail';
        }
        if (pathname.includes('search')) {
            return prefix + 'search';
        }
    },
    'www.15huang.com': () => {
        let pathname = location.pathname;
        let prefix = '15huang.';
        // 搜索结果 || 作者
        if (pathname == '/e/search/result/') {
            return prefix + 'category';
        }

        // 详情页
        if (pathname.includes('.html')) {
            return prefix + 'detail';
        }
        return prefix + 'category';
    },
    'www.ixuanquge.com': () => {
        let pathname = location.pathname;
        let prefix = '3uww.';
        // 排行
        if (pathname.includes('top')) {
            return prefix + 'category';
        }
        // 详情
        if (pathname.includes('down')) {
            return prefix + 'detail';
        }
        // 作者
        if (pathname.includes('author')) {
            return prefix + 'author';
        }
        // 分类
        if (pathname.search(/soft(\d+)/ig) !== -1) {
            return prefix + 'category';
        }
        // 搜索
        if (pathname.includes('search')) {
            return prefix + 'search';
        }
    },
    'www.wanbentxt.com': () => {
        let pathname = location.pathname;
        let prefix = 'wanbentxt.';
        //详情页(/数字/)
        if (/\/(\d)+\//.test(pathname)) {
            return prefix + 'detail';
        }
    },
    'www.yuzuhon.com': () => {
        let pathname = location.pathname;
        let prefix = 'yuzuhon.';
        if (/^\/book\/\d+$/.test(pathname)) {
            return prefix + 'detail';
        }
    }
};

/**
 * 需添加评分网站的配置
 */
const rateSiteTargetConfig = {
    'zxcs8.post': {
        name: 'zxcs8.post',
        bookName(item) {
            return item.querySelector('h1').innerText.match('《(.*?)》')[1];
        },
        bookAuthor(item) {
            return item.querySelector('h1').innerText.split('：').pop();
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            return '<p class="yinyong"><span style="font-size:14px;color:#FF0000;font-weight:bold">优书网评分: <a href = "'
                + bookLink + '" target="_blank">' + rate +
                '</a></span><p><p class="yinyong"><span style="font-size:14px;color:#FF0000;font-weight:bold">评分人数: ' + rateNum + '</span><p>';
        },
        anchorObj(item) {
            let obj = item.querySelector('.yinyong');
            return !obj ? item.querySelector('.pagefujian') : obj;
        },
        anchorPos: 'beforebegin',
        handler(options, callback) {
            callback({ site: this.name, item: document, ...options });
        },
    },
    'zxcs8.sort': {
        name: 'zxcs8.sort',
        bookName(item) {
            return item.firstElementChild.innerText.match('《(.*?)》')[1];
        },
        bookAuthor(item) {
            return item.firstElementChild.innerText.split('：').pop();
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            return '<a href= "' + bookLink + '" target = "_blank">&nbsp;&nbsp;&nbsp;评分：' + rate + '&nbsp;&nbsp;&nbsp;人数：' + rateNum + '</a>'
        },
        anchorObj(item) {
            return item.lastElementChild.querySelector('div');
        },
        anchorPos: 'beforebegin',
        handler(options, callback) {
            let bookList = Array.from(document.querySelectorAll('#plist'));
            bookList.forEach((item) => {
                callback({ site: this.name, item: item, ...options });
            });
        },
    },
    'zadzs.detail': {
        name: 'zadzs.detail',
        bookName(item) {
            return item.querySelector('h3[title]').title;
        },
        bookAuthor(item) {
            return item.querySelector('h3[title]>span>a').innerText;
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            return '<tr><td width="42px">评分：</td><td><a href="' + bookLink + '" target = "blank">' +
                rate + '</a></td></tr><tr><td width="42px">人数：</td><td>' + rateNum + '</td></tr>';
        },
        anchorObj(item) {
            return item.querySelector('.m-bookstatus>table>tbody');
        },
        anchorPos: "afterbegin",
        handler(options, callback) {
            callback({ site: this.name, item: document, ...options });
        },
    },
    'zadzs.search': {
        name: 'zadzs.search',
        bookName(item) {
            return item.querySelector('.book>h5>a').innerText;
        },
        bookAuthor(item) {
            return item.querySelector('.book>.price').innerText.split('：').pop();
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            return '<p class="price">评分：<a href="' + bookLink + '" target="_blank">' + rate + '</a>&nbsp;&nbsp;人数：' + rateNum + '</p>';
        },
        anchorObj(item) {
            return item.querySelector('.book>.disc');
        },
        anchorPos: "beforebegin",
        handler(options, callback) {
            let bookList = Array.from(document.querySelectorAll('.searchItem'));
            bookList.forEach((item) => {
                callback({ site: this.name, item: item, ...options });
            });
        },
    },
    '15huang.detail': {
        name: '15huang.detail',
        bookName(item) {
            return item.querySelector('.row>h1').innerText;
        },
        bookAuthor(item) {
            return item.querySelector('p.book-writer>a').innerText;
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            return '<p class="book-writer">优书评分：<a href="' + bookLink + '" target="_blank">' +
                rate + '</a></p><p class="book-writer">评分人数：' + rateNum + '</p>';
        },
        anchorObj(item) {
            return item.querySelector('p.book-writer');
        },
        anchorPos: "afterend",
        handler(options, callback) {
            callback({ site: this.name, item: document, ...options });
        },
    },
    '15huang.category': {
        name: '15huang.category',
        bookName(item) {
            return item.querySelector('h4.ellipsis').innerText.match('《(.*?)》')[1];
        },
        bookAuthor(item) {
            return item.querySelector('span.writer').innerText;
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            return '<em>|</em><span><a href="' + bookLink + '" target="_blank">' +
                rate + '分</a></span><em>|</em><span>' + rateNum + '人</span>';
        },
        anchorObj(item) {
            return item.querySelector('p.info.hei9.ellipsis');
        },
        anchorPos: "beforeend",
        handler(options, callback) {
            let bookList = Array.from(document.querySelectorAll("li.cate-infobox.col.xs-24.md-12"));
            bookList.forEach((item) => {
                callback({ site: this.name, item: item, ...options });
            });
        },
    },
    '3uww.detail': {
        name: '3uww.detail',
        bookName(item) {
            return item.querySelector('#downInfoTitle').innerText.match('《(.*?)》')[1];
        },
        bookAuthor(item) {
            return item.querySelector('.downInfoRowL>a').innerText;
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            return '<b>书籍评分：</b><a href="' + bookLink + '" class="strong blue" target="_blank">' +
                rate + '</a><br><b>评价人数：</b>' + rateNum + '<br>';
        },
        anchorObj(item) {
            return item.querySelector('.downInfoRowL>a').parentNode;
        },
        anchorPos: "beforeend",
        handler(options, callback) {
            callback({ site: this.name, item: document, ...options });
        },
    },
    '3uww.author': {
        name: '3uww.author',
        bookName(item) {
            return item.querySelector('.txt99>h2>a').innerText;
        },
        bookAuthor(item) {
            return document.querySelector('#Li1').innerText.replace(/的小说/ig, "");
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            return '<div>书籍评分：<i><a href="' + bookLink + '" class="strong blue" target="_blank">' +
                rate + '</a></i></div><div>评分人数：<i>' + rateNum + '</i></div>';
        },
        anchorObj(item) {
            return item.querySelector('.txt99>ul').children[2];
        },
        anchorPos: "afterbegin",
        handler(options, callback) {
            let bookList = Array.from(document.querySelectorAll('.pinglw'));
            bookList.forEach((item) => {
                callback({ site: this.name, item: item, ...options });
            });
        },
    },
    '3uww.category': {
        name: '3uww.category',
        bookName(item) {
            return item.info.querySelector('span.mainSoftName>a').innerText;
        },
        bookAuthor(item) {
            return item.bottom.querySelectorAll('.mainRunSystem')[1].innerText.replace(/书籍作者：/ig, "").trim();
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            return '<div class="mainAccredit"><span class="mainGreen">书籍评分：<a href = "' + bookLink + '" target = "_blank" ><u>'
                + rate + '</u></a></span></div><div class="mainstar"><span class="mainGreen">评分人数：</span>' + rateNum + '</div>'
        },
        anchorObj(item) {
            return item.bottom.querySelector('.mainRunSystem');
        },
        anchorPos: "afterend",
        handler(options, callback) {
            let bookInfo = Array.from(document.querySelectorAll('.mainListInfo'));
            let bookBottom = Array.from(document.querySelectorAll('.mainListBottom'));
            bookInfo.forEach((value, index) => {
                callback({ site: this.name, item: { info: value, bottom: bookBottom[index] }, ...options });
            });
        },
    },
    '3uww.search': {
        name: '3uww.search',
        bookName(item) {
            return item.info.querySelector('a').innerText.split('/')[0];
        },
        bookAuthor(item) {
            return item.info.querySelector('a').innerText.split('/')[1].replace(/作者：/ig, "");
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            return '&nbsp;&nbsp;评分：<a href="' + bookLink + '" target="_blank"><span style="color:#0066FF">' + rate + '</span></a>&nbsp;&nbsp;人数：' + rateNum;
        },
        anchorObj(item) {
            return item.bottom.querySelector('.oldDate');
        },
        anchorPos: "afterend",
        handler(options, callback) {
            let bookInfo = Array.from(document.querySelectorAll('.searchTopic'));
            let bookBottom = Array.from(document.querySelectorAll('.searchInfo'));
            bookInfo.forEach((value, index) => {
                callback({ site: this.name, item: { info: value, bottom: bookBottom[index] }, ...options });
            });
        }
    },
    'wanbentxt.detail': {
        name: 'wanbentxt.detail',
        bookName(item) {
            return item.querySelector('div.contentDiv > div > div.detail > div.detailTop > div.detailTopMid > div.detailTitle > h1').innerText;
        },
        bookAuthor(item) {
            return item.querySelector('div.contentDiv > div > div.detail > div.detailTop > div.detailTopMid > div.writer > a').innerText;
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            return `<tr>
                    <td width="10%"><span>书籍评分：</span></td>
                    <td width="10%"><a href="${bookLink}" target="_blank">${rate}</a></td>
                    <td width="10%"><span>评分人数：</span></td>
                    <td width="10%">${rateNum}</td>
                </tr>`;

        },
        anchorObj(item) {
            return item.querySelector('div.detail > div.detailTop > div.detailTopMid > table > tbody').firstElementChild;
        },
        anchorPos: "afterend",
        handler(options, callback) {
            callback({ site: this.name, item: document, ...options });
        },
    },
    'wanbentxt.category': {
        name: 'wanbentxt.category',
        bookName(item) {
            return item.querySelector('div.sortPhr > a').innerText;
        },
        bookAuthor(item) {
            return item.querySelector('div.sortPhr > p.author > a').innerText;
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            return `<p class="actor" style="margin-top: 7px"><em>评分：</em><a href="${bookLink}" target="_blank">${rate}</a>&nbsp;&nbsp;&nbsp;&nbsp;人数：${rateNum}</p>`;
        },
        anchorObj(item) {
            return item.querySelector('div.sortPhr > p.actor');
        },
        anchorPos: "afterend",
        handler(options, callback) {
            let bookList = Array.from(document.querySelector('div.contentDiv > div > div.sortBottom > div.sortList > ul').children);
            bookList.forEach((item) => {
                callback({ site: this.name, item: item, ...options });
            });
        },
    },
    'yuzuhon.detail': {
        name: 'yuzuhon.detail',
        bookName(item) {
            return item.querySelector("#__layout > div > div.app-main > div > div.container > div.book-info-section > h2").innerText;
        },
        bookAuthor(item) {
            return item.querySelector("#__layout > div > div.app-main > div > div.container > div.book-info-section > div > div.book-info__metadata > div > span > a").innerText;
        },
        maxNum: MAX_SEARCH_NUM,
        rateItem(rate, rateNum, bookLink) {
            let rateStars = this._packageStar(Math.round(rate / 2 * 10) / 10, 5);
            return `<div style="padding: 15px 0px; border-top: 1px solid rgb(234, 234, 234);">
                        <span class="text-secondary"><a href="${bookLink}" target="_blank">优书网</a></span>
                        <div class="d-flex align-items-center mb-2">
                            <div class="book-info__rate"><strong>${rate}</strong></div>
                            <div class="book-info__star">
                                <div class="rate">
                                    ${rateStars}
                                </div> 
                                <span> ${rateNum} 人评分 </span>
                            </div>
                        </div>
                    </div>`;
        },
        anchorObj(item) {
            return item.querySelector("#__layout > div > div.app-main > div > div.container > div.book-info-section > div > div.book-info__rate-block.mb-3");
        },
        anchorPos: "beforeend",
        handler(options, callback) {
            callback({ site: this.name, item: document, ...options });
        },
        _fullStar() {
            return `<span class="el-rate__item" style="cursor: auto;">
                        <i class="el-rate__icon el-icon-star-on" style="color: rgb(235, 159, 43);"></i>
                    </span>`;
        },
        _halfStar() {
            return `<span class="el-rate__item" style="cursor: auto;">
                        <i class="el-rate__icon el-icon-star-on" style="color: rgb(218, 218, 218);">
                            <i class="el-rate__decimal el-icon-star-on" style="color: rgb(235, 159, 43); width: 50%;"></i>
                        </i>
                    </span>`;
        },
        _emptyStar() {
            return `<span class="el-rate__item" style="cursor: auto;">
                        <i class="el-rate__icon el-icon-star-on" style="color: rgb(218, 218, 218);"></i>
                    </span>`;
        },
        _starsTemplate(rate, total, stars) {
            return `<div class="rate">
                        <div role="slider" aria-valuenow="${rate}" aria-valuetext="" aria-valuemin="0" aria-valuemax="${total}" tabindex="0" class="el-rate">
                            ${stars}
                        </div> 
                    </div> `;
        },
        _packageStar(rate, total) {
            let stars = '';
            if (rate < 0) {
                for (let i = 0; i < total; i++) {
                    stars += this._emptyStar();
                }
                return this._starsTemplate(rate, total, stars);
            }
            let fullStars = Math.floor(rate);
            let emptyStars = total - Math.ceil(rate);
            let halfStars = total - fullStars - emptyStars;
            for (let i = 0; i < fullStars; i++) {
                stars += this._fullStar();
            }
            for (let j = 0; j < halfStars; j++) {
                stars += this._halfStar();
            }
            for (let k = 0; k < emptyStars; k++) {
                stars += this._emptyStar();
            }
            return this._starsTemplate(rate, total, stars);
        },
    },
};

/**
 * 下载链接来源网站配置
 */
const downloadSiteSourceConfig = {
    'zxcs8': {
        name: 'zxcs8',
        siteName: '知轩藏书',
        host: 'http://www.zxcs.me',
        searchConfig(args) {
            return { url: this.host + '/index.php?keyword=' + args.bookName, method: "GET" };
        },
        bookList(item) {
            return Array.from(item.getElementsByTagName('dl'));
        },
        bookName(item) {
            return item.children["0"].innerText.match('《(.*?)》')[1];
        },
        bookAuthor(item) {
            return item.children["0"].innerText.split('：').pop();
        },
        bookLink(item) {
            return item.children["0"].getElementsByTagName('a')[0].href;
        },
        downloadLink(item) {
            return item.querySelector('.down_2>a').href;
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_FETCH })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
    },
    'nordfxs': {
        name: 'nordfxs',
        siteName: '龙凤互联',
        host: 'https://www.nordfxs.com',
        searchConfig(args) {
            let data = 'formhash=191940c0&srchtxt=' + args.bookName + '&searchsubmit=yes';
            let headers = { "Content-Type": "application/x-www-form-urlencoded" };
            return { url: this.host + '/search.php?mod=forum', data: data, method: "POST", headers: headers };
        },
        bookList(item) {
            return Array.from(item.querySelectorAll('.pbw'));
        },
        bookName(item) {
            return item.querySelector('.xs3>a').innerText.split('（').shift().replace(/[《,》]/g, '');
        },
        bookAuthor(item) {
            return item.querySelector('.xs3>a').innerText.split('：').pop();
        },
        bookLink(item) {
            return item.querySelector('.xs3>a').href;
        },
        downloadLink(item) {
            return item.querySelector('.xs3>a').href;
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_DIRECT })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
    },
    '15huang': {
        name: '15huang',
        siteName: '书荒网',
        host: 'http://www.15huang.com',
        searchConfig(args) {
            let data = 'show=title%2Cwriter%2Ckeyboard&tbname=news&tempid=1&keyboard=' + encodeURIComponent(args.bookName);
            let headers = { "Content-Type": "application/x-www-form-urlencoded", "Cookie": "alllclastsearchtime=" + (Date.parse(new Date) / 1000 - 480) };
            return { url: this.host + '/e/search/index.php', data: data, method: "POST", headers: headers, anonymous: true };
        },
        bookList(item) {
            return Array.from(item.querySelectorAll("li.cate-infobox.col.xs-24.md-12"));
        },
        bookName(item) {
            return item.querySelector('h4.ellipsis').innerText.match('《(.*?)》')[1];
        },
        bookAuthor(item) {
            return item.querySelector('span.writer').innerText;
        },
        bookLink(item) {
            return item.querySelector('a.open.bg-hui-hover').href;
        },
        downloadLink(item) {
            return this.host + item.querySelector('.downurl.col.xs-24.md-5>a').href.replace(location.origin, '');
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_FETCH })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
    },
    '3uww': {
        name: '3uww',
        siteName: '炫书网',
        host: 'https://www.ixuanquge.com',
        searchConfig(args) {
            let data = 'searchkey=' + args.bookName;
            let headers = { "Content-Type": "application/x-www-form-urlencoded" };
            return { url: this.host + '/search.html', data: data, method: "POST", headers: headers };
        },
        bookList(item) {
            return Array.from(item.querySelectorAll('.searchTopic'));
        },
        bookName(item) {
            return item.querySelector('a').innerText.split('/')[0];
        },
        bookAuthor(item) {
            return item.querySelector('a').innerText.split('/')[1].replace(/作者：/ig, "");
        },
        bookLink(item) {
            return item.querySelector('a').href;
        },
        downloadLink(item) {
            return item.querySelector('.downAddress_li>a').href;
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_FETCH })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
    },
    'ixdzs': {
        name: 'ixdzs',
        siteName: '爱下电子书',
        host: 'https://www.aixdzs.com',
        searchConfig(args) {
            return { url: this.host + '/bsearch?q=' + args.bookName, method: "GET" };
        },
        bookList(item) {
            return Array.from(item.querySelectorAll('div.box_k>ul>li'));
        },
        bookName(item) {
            return item.querySelector('h2.b_name>a').innerText;
        },
        bookAuthor(item) {
            return item.querySelector('p.b_info>span>a').innerText;
        },
        bookLink(item) {
            return this.host + item.querySelector('h2.b_name>a').href.replace(location.origin, '');
        },
        downloadLink(item) {
            return this.host + item.querySelector('h2.b_name>a').href.replace(location.origin, '');
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_DIRECT })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
    },
    'wanbentxt': {
        name: 'wanbentxt',
        siteName: '完本神站',
        host: 'https://www.wanbentxt.com',
        _isBookList: false,
        _isBookListChecked: false,
        _isBlockedBySearchTimeGap: false,
        _isBlockedBySearchTimeGapChecked: false,
        _isCurrentBookList(item) {
            //如果匹配到的搜索结果只有一条, 会直接进入对应的书籍详情页，因此需要判断一下
            if (!this._isBookListChecked) {
                this._isBookList = !item.querySelector('div.contentDiv > div > div.detail');
                this._isBookListChecked = true;
            }
            return this._isBookList;
        },
        _isCurrentBlockedBySearchTimeGap(item) {
            //由于搜索时间间隔过短被限制
            if (!this._isBlockedBySearchTimeGapChecked) {
                this._isBlockedBySearchTimeGap = (item.querySelector("div.blockcontent") || { innerText: '' }).innerText.includes('间隔时间不得少于');
                this._isBlockedBySearchTimeGapChecked = true;
            }
            return this._isBlockedBySearchTimeGap;
        },
        searchConfig(args) {
            let data = 'searchtype=articlename&searchkey=' + GBK.URI.encodeURI(args.bookName);
            let headers = { "Content-Type": "application/x-www-form-urlencoded;charset=gbk", "Cookie": "jieqiVisitTime=jieqiArticlesearchTime%3d" + (Date.parse(new Date) / 1000 - 240) };
            let details = { url: this.host + '/modules/article/search.php', data: data, method: 'POST', headers: headers, overrideMimeType: 'text/html;charset=gbk' };
            //Tampermonkey 有个BUG, anonymous = true 时 overrideMimeType 无效
            if (!isTampermonkey()) {
                Object.assign(details, { anonymous: true });
            }
            return details;

        },
        bookList(item) {
            //检查是否由于搜索时间间隔问题而被限制
            this._isCurrentBlockedBySearchTimeGap(item);
            //书籍详情页, 包装下 html 直接返回即可
            if (this._isCurrentBookList(item)) {
                return Array.from(item.querySelectorAll('body > div.contentDiv > div > div.result > div.resultLeft > ul > li'));
            }
            return Array.from(item.querySelectorAll('body'));

        },
        bookName(item) {
            if (this._isCurrentBookList(item)) {
                return item.querySelector('div.sortPhr > a').innerText;
            }
            return item.querySelector('div.contentDiv > div > div.detail > div.detailTop > div.detailTopMid > div.detailTitle > h1').innerText;
        },
        bookAuthor(item) {
            if (this._isCurrentBookList(item)) {
                return item.querySelector('div.sortPhr > p.author > a').innerText;
            }
            return item.querySelector('div.contentDiv > div > div.detail > div.detailTop > div.detailTopMid > div.writer > a').innerText;
        },
        bookLink(item) {
            let href;
            if (this._isCurrentBookList(item)) {
                href = item.querySelector('div.sortPhr > a').href;
            } else {
                href = item.querySelector('div.contentDiv > div > div.route').lastElementChild.href;
            }
            return this.host + href.replace(location.origin, '').replace(this.host, '');
        },
        downloadLink(item) {
            return this.host + '/down' + this.bookLink(item).replace(location.origin, '').replace(this.host, '');
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_PROCESS })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
        //bookLink是否应该添加缓存
        shouldCacheBookLink(options) {
            return !this._isCurrentBlockedBySearchTimeGap(options.item);
        },
    },
    'afs360': {
        name: 'afs360',
        siteName: '万书网',
        host: 'https://www.afs360.com',
        searchConfig(args) {
            let data = 'show=title&keyboard=' + args.bookName;
            let headers = { "Content-Type": "application/x-www-form-urlencoded", "Cookie": "txt2017lastsearchtime=" + (Date.parse(new Date) / 1000 - 480) };
            return { url: this.host + '/e/search/index.php', data: data, method: "POST", headers: headers, anonymous: true };
        },
        bookList(item) {
            return Array.from(item.querySelectorAll("tr > td > table.box > tbody > tr > td > h2"));
        },
        bookName(item) {
            return item.querySelector('a').innerText;
        },
        bookAuthor(item) {
            return item.lastChild.textContent.slice(1, -1);
        },
        bookLink(item) {
            return this.host + item.querySelector('a').href.replace(location.origin, '').replace(this.host, '');
        },
        downloadLink(item) {
            return this.bookLink(item);
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_DIRECT })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
    },
    'auzw': {
        name: 'auzw',
        siteName: '傲世中文网',
        host: 'https://www.auzw.com',
        searchConfig(args) {
            return { url: this.host + '/search.php?q=' + args.bookName, method: "GET" };
        },
        bookList(item) {
            return Array.from(item.querySelectorAll("div > div> div.book_info"));
        },
        bookName(item) {
            return item.querySelector("a").innerText.match('《(.*?)》')[1];
        },
        bookAuthor(item) {
            return item.querySelector("p.nowrap > a").innerText;
        },
        bookLink(item) {
            return this.host + item.querySelector('a').href.replace(location.origin, '').replace(this.host, '');
        },
        downloadLink(item) {
            return this.host + item.querySelector('small > a').href.replace(location.origin, '').replace(this.host, '');
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_PROCESS })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
    },
    'mianhuatang': {
        name: 'mianhuatang',
        siteName: '棉花糖小说网',
        host: 'http://www.mianhuatang.cc',
        searchConfig(args) {
            let data = 'searchkey=' + args.bookName;
            let headers = { "Content-Type": "application/x-www-form-urlencoded" };
            return { url: this.host + '/search.php', data: data, method: "POST", headers: headers };
        },
        bookList(item) {
            //从第一行开始, 去除表头
            return Array.from(item.querySelectorAll("div.main > div > table > tbody > tr")).slice(1);
        },
        bookName(item) {
            return item.querySelector("a").innerText;
        },
        bookAuthor(item) {
            return item.children[2].innerText;
        },
        bookLink(item) {
            return this.host + item.querySelector('a').href.replace(location.origin, '').replace(this.host, '');
        },
        downloadLink(item) {
            let bookId = this.bookLink(item).match(/\/(\d+)\/$/)[1];
            return this.host + `/down/txt${bookId}.html`;
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_PROCESS })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
    },
    'balingtxt': {
        name: 'balingtxt',
        siteName: '八零电子书',
        host: 'http://www.balingtxt.com',
        searchConfig(args) {
            let data = 'searchkey=' + args.bookName + '&s=18140131260432570322';
            let headers = { "Content-Type": "application/x-www-form-urlencoded" };
            return { url: this.host + '/modules/article/search.php', data: data, method: "POST", headers: headers };
        },
        bookList(item) {
            //从第一行开始, 去除表头
            return Array.from(item.querySelectorAll("#content > div > ul > li.storelistbt5a"));
        },
        bookName(item) {
            return item.querySelector("a.bookname").innerText.match(/《(.*?)》/)[1];
        },
        bookAuthor(item) {
            return item.querySelector("p > a").innerText;
        },
        bookLink(item) {
            return this.host + item.querySelector('a.bookname').href.replace(location.origin, '').replace(this.host, '');
        },
        downloadLink(item) {
            return this.bookLink(item).replace('.html', '/down.html');
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_PROCESS })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
    },
    'dushuxiaozi': {
        name: 'dushuxiaozi',
        siteName: '读书小子',
        host: 'https://www.dushuxiaozi.com',
        searchConfig(args) {
            return { url: this.host + '/?s=' + args.bookName, method: "GET" };
        },
        bookList(item) {
            return Array.from(item.querySelectorAll("#main > ul > li.entry-title > a"));
        },
        bookName(item) {
            return item.innerText.match('《(.*?)》')[1];
        },
        bookAuthor(item) {
            return item.innerText.match(/[:：](.*)/)[1];
        },
        bookLink(item) {
            return item.href.replace(location.origin, '');
        },
        downloadLink(item) {
            return this.bookLink(item);
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_DIRECT })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
    },
    'jingjiaocangshu': {
        name: 'jingjiaocangshu',
        siteName: '精校藏书',
        host: 'https://jingjiaocangshu.cn',
        searchConfig(args) {
            return { url: this.host + '/?s=' + args.bookName, method: "GET" };
        },
        bookList(item) {
            return Array.from(item.querySelectorAll("#primary-home > article"));
        },
        bookName(item) {
            return item.querySelector("header > h1").innerText.match('《(.*?)》')[1];
        },
        bookAuthor(item) {
            return item.querySelector("header > h1").innerText.match(/[:：](.*)/)[1];
        },
        bookLink(item) {
            //实际是下载链接
            return this.host + item.querySelector("div.entry-content > div > div > a").href.replace(location.origin, '').replace(this.host, '');
        },
        downloadLink(item) {
            return this.bookLink(item);
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_DIRECT })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
    },
    'lenshula': {
        name: 'kenshula',
        siteName: '啃书啦',
        host: 'https://www.kenshula.com',
        _isBookList: false,
        _isBookListChecked: false,
        _isCurrentBookList(item) {
            //如果匹配到的搜索结果只有一条, 会直接进入对应的书籍详情页，因此需要判断一下
            if (!this._isBookListChecked) {
                this._isBookList = item.querySelector('#conn > div > div.fleft.column-l > div > div.search-title');
                this._isBookListChecked = true;
            }
            return this._isBookList;
        },
        searchConfig(args) {
            let data = 'area=2&searchkey=' + GBK.URI.encodeURI(args.bookName);
            let headers = { "Content-Type": "application/x-www-form-urlencoded" };
            return { url: this.host + '/modules/article/search.php', data: data, method: 'POST', headers: headers, overrideMimeType: 'text/html;charset=gbk', anonymous: true };

        },
        bookList(item) {
            if (this._isCurrentBookList(item)) {
                return Array.from(item.querySelectorAll('#conn > div > div.fleft.column-l > div > ul > li'));
            }
            return Array.from(item.querySelectorAll('head'));

        },
        bookName(item) {
            if (this._isCurrentBookList(item)) {
                return item.querySelector("div > h3 > a").innerText;
            }
            return item.querySelector('meta[property="og:novel:book_name"]').getAttribute("content");
        },
        bookAuthor(item) {
            if (this._isCurrentBookList(item)) {
                return item.querySelector("p.author").lastChild.wholeText;
            }
            return item.querySelector('meta[property="og:novel:author"]').getAttribute("content");
        },
        bookLink(item) {
            if (this._isCurrentBookList(item)) {
                return this.host + item.querySelector("div > h3 > a").href.replace(location.origin, '').replace(this.host, '');
            }
            return item.querySelector('meta[property="og:novel:read_url"]').getAttribute("content");
        },
        downloadLink(item) {
            return this.bookLink(item);
        },
        handler(options) {
            return getDownLoadLink((Object.assign(options, { type: DOWNLOAD_TYPE_DIRECT })));
        },
        parse(bookInfo, handler, response) {
            return parseRawDownloadResponse(bookInfo, handler, response);
        },
        // type: DOWNLOAD_TYPE_FETCH 需设置
        fetchConfig(options) {
            return { url: options.url, method: 'GET' };
        },
    },
};

/**
 * 需要添加下载链接的网站路由
 * 转换为 downloadSiteTargetConfig 的键名
 */
const downloadSiteTargetRoute = {
    'www.yousuu.com': () => {
        return 'yousuu';
    },
    'www.yuzuhon.com': () => {
        return 'yuzuhon';
    },
};

/**
 * 需要添加下载链接的网站配置
 */
const downloadSiteTargetConfig = {
    'yousuu': {
        name: 'yousuu',
        siteName: '优书网',
        _utils: {},
        //预处理
        prepare() {
            //获取dataV的值
            let node = document.querySelector('div.common-card-layout.main-left-header');
            let dataV = node.outerHTML.match(/data-v-(\w+)/g);
            this._utils.dataV = dataV;
            //插入下载容器
            let content = '<div ' + dataV[0] + '="" class="common-card-layout main-left-header" id="gm-insert-download-box" style="display: none">'
                + '<div ' + dataV[1] + '="" ' + dataV[2] + '="" class="tabs" id="gm-insert-download-content"></div></div>';
            document.querySelector('div.common-card-layout.main-left-header').insertAdjacentHTML('beforebegin', content);
        },
        bookName() {
            return document.querySelector('div.book-info-wrap>div.book-info-detail>h1.book-name').innerText;
        },
        bookAuthor() {
            return document.querySelector('div.book-info-wrap>div.book-info-detail>p.book-author>a').innerText;
        },
        //获取下载链接后的处理
        task(info) {
            let obj = document.querySelector('#gm-insert-download-content');
            let item = '';
            //如果第一次插入,则显示父容器，同时插入标识
            if (obj.parentElement.style.display === 'none') {
                obj.parentElement.setAttribute('style', 'display:run-in');
                item = '<label ' + this._utils.dataV[3] + '="" class="tab current">下载地址</label>';
            }
            item += '<label ' + this._utils.dataV[3] + '="" class="tab"><a href="' + info.downloadLink + '" target="_blank">' + info.siteName + '</a></label>';
            obj.insertAdjacentHTML('beforeend', item);
        },
    },
    'yuzuhon': {
        name: 'yuzuhon',
        siteName: '柚子书',
        //预处理
        prepare() {
            let content =
                `<section class="book-page__section mt-5" id="gm-insert-download-box" style="display: none">
                    <div class="section-head pl-0 border-0">
                        <h2 class="section-head__title">下载地址</h2>
                    </div>
                    <div class="rich-content is-collapsed">
                        <div class="font" id="gm-insert-download-content">
                        </div>
                    </div>
                </section>`;
            //插入下载容器
            document.querySelector('#__layout > div > div.app-main > div > div.container > div > section').insertAdjacentHTML('afterend', content);
        },
        bookName() {
            return document.querySelector("#__layout > div > div.app-main > div > div.container > div.book-info-section > h2").innerText;
        },
        bookAuthor() {
            return document.querySelector("#__layout > div > div.app-main > div > div.container > div.book-info-section > div > div.book-info__metadata > div > span > a").innerText;
        },
        //获取下载链接后的处理
        task(info) {
            let obj = document.querySelector('#gm-insert-download-content');
            let box = document.querySelector('#gm-insert-download-box');
            let item = '';
            //如果第一次插入,则显示父容器，同时插入标识
            if (box.style.display === 'none') {
                box.setAttribute('style', 'display:run-in');
                item = `<a href="${info.downloadLink}" target="_blank" class="">${info.siteName}</a>`;
            } else {
                item =
                    `<span>
                        <span class="dot"></span>
                        <a href="${info.downloadLink}" target="_blank" class="">${info.siteName}</a>
                    </span> `;
            }
            obj.insertAdjacentHTML('beforeend', item);
        },
    }
}

/*======================================================================================================*/

/*===============================================  方法  ================================================*/

/*===============================================  util  ===============================================*/

/**
 * 数组的差集
 * @param {array} firstArray 
 * @param {array} secondArray 
 * @returns {array}
 */
let arrayDiff = (firstArray, secondArray) => {
    let set = new Set(secondArray);
    return [...firstArray].filter(item => !set.has(item));
}

/*=====================================================================================================*/


/*===============================================  base  ===============================================*/
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

/*=====================================================================================================*/

/*===============================================  评分  ===============================================*/
/**
 * 获取评分信息
 * @param handler
 * @param bookInfo {bookName:'',bookAuthor:''}
 */
let getRateInfo = async (handler, bookInfo) => {
    let cacheKey = 'GET:RATE:' + handler.name.toUpperCase() + ':NAME:' + bookInfo.bookName + ':AUTHOR:' + bookInfo.bookAuthor;
    //查询缓存
    let cacheValue = storage.getValue(cacheKey, SEARCH_EXPIRED_TIME);
    if (cacheValue !== null) {
        return cacheValue;
    }
    let response = await fetch(handler.request(bookInfo));
    let data = handler.parse(bookInfo, response);
    storage.setValue(cacheKey, data);
    return data;
};

/**
 * 将评分插入目标网站
 * @param options
 */
let insertRate = async (options) => {
    let siteConfig = rateSiteTargetConfig[options.site];
    let args = { bookName: siteConfig.bookName(options.item), bookAuthor: siteConfig.bookAuthor(options.item), maxNum: siteConfig.maxNum };
    let data = await getRateInfo(rateSiteSourceConfig[options.rateSourceSite], args);
    if (data.match) {
        siteConfig.anchorObj(options.item).insertAdjacentHTML(siteConfig.anchorPos, siteConfig.rateItem(data.score, data.num, data.url));
    }
};

/**
 * 插入评分(入口)
 * @param hostname
 */
let insertBookRate = (hostname) => {
    if (Object.keys(rateSiteTargetRoute).includes(hostname)) {
        let site = rateSiteTargetRoute[hostname]();
        if (!site) {
            return;
        }
        let siteConfig = rateSiteTargetConfig[site];
        if (!siteConfig) {
            return;
        }
        let options = { site: site, rateSourceSite: 'yousuu' };
        siteConfig.handler(options, insertRate);
    }
}

/*=====================================================================================================*/

/*===============================================  下载  ===============================================*/
/**
 * 解析下载链接
 * @param options
 */
let getDownLoadLink = async (options) => {
    let type = options.type;
    let siteConfig = downloadSiteSourceConfig[options.site];
    if (type === DOWNLOAD_TYPE_DIRECT) { //直接获取
        return { downloadLink: options.bookLink, siteName: siteConfig.siteName };
    } else if (type === DOWNLOAD_TYPE_FETCH) { //从链接中再次解析
        //缓存
        let cacheKey = 'GET:DOWNLOADLINK:' + siteConfig.name.toUpperCase() + ':' + hex_md5(options.bookLink);
        let cacheValue = storage.getValue(cacheKey, DOWNLOAD_EXPIRED_TIME);
        if (cacheValue !== null) {
            return { downloadLink: cacheValue, siteName: siteConfig.siteName };
        }
        let response = await fetch(siteConfig.fetchConfig({ url: options.bookLink }));
        let html = new DOMParser().parseFromString(response.responseText, "text/html");
        let downloadLink = siteConfig.downloadLink(html);
        storage.setValue(cacheKey, downloadLink);
        return { downloadLink: downloadLink, siteName: siteConfig.siteName };
    } else if (type === DOWNLOAD_TYPE_PROCESS) {
        return { downloadLink: siteConfig.downloadLink(options.bookItem), siteName: siteConfig.siteName };
    }
};

/**
 * 从原始响应返回解析下载信息
 * @param bookInfo
 * @param response
 */
let parseRawDownloadResponse = (bookInfo, handler, response) => {
    let html = new DOMParser().parseFromString(response.responseText, "text/html");
    let bookList = handler.bookList(html);
    let bookLink = '';
    let bookItem = '';
    let match = bookList.some((item) => {
        if (handler.bookName(item).trim() === bookInfo.bookName.trim() && handler.bookAuthor(item).trim() === bookInfo.bookAuthor.trim()) {
            bookItem = item;
            bookLink = handler.bookLink(item);
            return true;
        }
    });
    let data = { bookLink: bookLink, bookItem: bookItem, match: match };
    let cache = { bookLink: bookLink, bookItem: (match ? bookItem.innerHTML : ''), match: match };
    return [data, cache];
};

/**
 * 获取下载信息
 * @param handler
 * @param bookInfo
 */
let getDownloadInfo = async (handler, bookInfo) => {
    //查缓存
    let cacheKey = 'GET:BOOKLINK:' + handler.name.toUpperCase() + ':NAME:' + bookInfo.bookName + ':AUTHOR:' + bookInfo.bookAuthor;
    let cacheValue = storage.getValue(cacheKey, DOWNLOAD_EXPIRED_TIME);
    if (cacheValue !== null) {
        return { bookLink: cacheValue.bookLink, bookItem: new DOMParser().parseFromString(cacheValue.bookItem, "text/html"), match: cacheValue.match };
    }

    let response = await fetch(handler.searchConfig({ bookName: bookInfo.bookName }));
    let [data, cache] = handler.parse(bookInfo, handler, response);
    //判断是否应该添加缓存
    if (!handler.hasOwnProperty('shouldCacheBookLink') || handler.shouldCacheBookLink({ item: data.bookItem })) {
        storage.setValue(cacheKey, cache);
    }
    return data;
};

/**
 * 将下载链接插入目标网站
 * @param options
 */
let insertDownload = async (options) => {
    let target = downloadSiteTargetConfig[options.downloadTargetSite];
    let bookInfo = { bookName: target.bookName(), bookAuthor: target.bookAuthor() };
    let source = downloadSiteSourceConfig[options.site];
    //获取下载信息
    let downloadInfo = await getDownloadInfo(source, bookInfo);
    if (downloadInfo.match) {
        //解析下载链接
        let data = await source.handler({ site: options.site, ...downloadInfo });
        //处理下载链接
        return target.task(data);
    }
};

/**
 * 插入下载链接(入口)
 * @param hostname
 */
let insertBookDownloadLink = async (hostname) => {
    if (Object.keys(downloadSiteTargetRoute).includes(hostname)) {
        let sites = arrayDiff(Object.keys(downloadSiteSourceConfig), DOWNLOAD_SITES_EXCEPTED);
        let downloadTargetSite = downloadSiteTargetRoute[hostname]();
        let targetConfig = downloadSiteTargetConfig[downloadTargetSite];
        targetConfig.prepare();
        let promises = sites.map((site) => insertDownload({ site: site, downloadTargetSite: downloadTargetSite }).catch(e => console.log(e)));
        await Promise.all(promises);
    }
}

/*=====================================================================================================*/

/**
 * 检查插件兼容性
 */
let checkCanUse = () => {
    let message = '脚本 [优书网 <=> 知轩藏书] ';
    let canUse = true;
    if (typeof GM_xmlhttpRequest === "undefined") {
        message += "暂不支持 Greasemonkey 4.x, 请使用 Tampermonkey 或 Violetmonkey 。";
        canUse = false;
    }
    return { canUse: canUse, message: message };
};

let isTampermonkey = () => {
    return (GM_info || { scriptHandler: '' }).scriptHandler.toLowerCase() === SCRIPT_HANDLER_TAMPERMONKEY;
}

/**
 * 开始执行脚本
 */
let start = () => {
    'use strict';
    //检查兼容性
    let checkResult = checkCanUse();
    if (!checkResult.canUse) {
        alert(checkResult.message);
        return;
    }
    //插入评分
    insertBookRate(location.hostname);
    //插入下载链接
    insertBookDownloadLink(location.hostname);
}

/**
 * 延时执行脚本
 * @param {integer} interval 
 */
let startWithInterval = (interval) => {
    window.setTimeout(start, interval);
}

/**
 * 当前站点是否触发 ready 事件
 * @param {string} hostname 
 */
let isSiteTriggerReadyEvent = (hostname) => {
    return !Object.keys(SITES_WAIT_KEY_ELEMENT).includes(hostname);
}
/*======================================================================================================*/
/**
 * 入口
 */

if (isSiteTriggerReadyEvent(location.hostname)) {
    $().ready(startWithInterval(1000));
} else {
    waitForKeyElements(SITES_WAIT_KEY_ELEMENT[location.hostname], () => startWithInterval(1000));
}