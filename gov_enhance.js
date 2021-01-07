// ==UserScript==
// @name         山东政务网增强
// @namespace    https://github.com/isTianXin/GMScript/
// @version      1.0.2
// @description  山东政务网增强:一键搜索全部区县，回车搜索
// @author       Tian Xin
// @match        *://*.sd.gov.cn/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_openInTab
// @run-at       document-end
// ==/UserScript==

'use strict';

// 济南 code
const CODE_JINAN = "370100000000";
const REGIONS_OF_JINAN = "regions_of_jinan";
const ITEM_INPUT_ID = "itemname";
const SEARCH_ALL_REGIONS_BUTTON = "searchFromAllRegions";

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
/**
 * 根据 parent code 获取地区
 * @param parentCode 父ID
 */
let findRegionsByParentCode = async (parentCode) => {
    let regions = await fetch({
        method: "GET",
        url: 'http://zwfw.sd.gov.cn/sdzw/front/head/findRegionsByParentCode.do?parentCode=' + parentCode
    })
    let data = JSON.parse(regions.responseText).data || [];

    return data.map((item) => {
        item.code = item.code.substring(0, 6)
        return item;
    });
}

/**
 * 济南区划
 * @param {boolean} insertSelf 是否插入济南市在最前面
 */
let regionsOfJiNan = async (insertSelf = false) => {
    let regions = GM_getValue(REGIONS_OF_JINAN, undefined);
    if (regions === undefined) {
        regions = await findRegionsByParentCode(CODE_JINAN);
        GM_setValue(REGIONS_OF_JINAN, regions);
    }
    if (insertSelf) {
        regions.unshift({
            "code": CODE_JINAN.substring(0, 6),
            "name": "济南市",
        })
    }
    return regions;
}

//从行中提取出信息
let extractApproveInfoFromXlYinTableRow = (tr) => {
    let tds = tr.querySelectorAll("td");
    if (!tds || !tds[1]) {
        return null;
    }
    let aLabel = tds[1].querySelector(".list_son > a");
    if (!aLabel) {
        return null;
    }
    return {
        name: aLabel.innerText,
        url: aLabel.href,
        department: tds[2].innerText || ""
    };
}
/**
 * 从xl_yin, xl_yin1 中提取单个选项
 * @param item 
 */
let extractApproveItemFromXlYin = (item) => {
    //这里应该是多个tr
    return Array.from(item.querySelectorAll("table > tbody > tr"))
        .map(extractApproveInfoFromXlYinTableRow)
        .filter(item => item);
};
/**
 * 从xl_yin, xl_yin1 中提取全部
 * @param item 
 */
let extractApproveItemsFromXlYin = (item) => {
    return Array.from(document.querySelectorAll(".xl_yin,.xl_yin1"))
        .map(extractApproveItemFromXlYin)
        .filter(item => item)
        .flat();
}
/**
 * 从 xl, xl1 中提取
 * @param item 
 */
let extractApproveInfoFromXl = (item) => {
    let aLabel = item.querySelector(".zh > a");
    if (!aLabel) {
        return null;
    }
    if (!aLabel.innerText || !aLabel.href) {
        return null;
    }
    return {
        name: aLabel.innerText,
        url: aLabel.href,
        department: item.querySelectorAll(".no_a")[1].innerText || ""
    };
};

/**
 * 从 xl, xl1 中提取全部
 * @param item 
 */
let extractApproveItemsFromXl = () => {
    return Array.from(document.querySelectorAll(".xl,.xl1"))
        .map(extractApproveInfoFromXl)
        .filter(item => item);
}

//theme -> othertheme
const themeMap = {
    "D01T01": "hysy",
    "D01T02": "hjsf",
    "D01T03": "jypx",
    "D01T04": "ldjy",
    "D01T05": "zfbz",
    "D01T06": "zyzg",
    "D01T07": "shbz",
    "D01T08": "nsjf",
    "D01T09": "ylws",
    "D01T10": "jtly",
    "D01T11": "cjrj",
    "D01T12": "shfw",
    "D01T13": "mzzj",
    "D01T14": "snfw",
    "D01T15": "swbz",
    "D01T99": "qt",
    "D02T16": "slbg",
    "D02T17": "hyzy",
    "D02T18": "tzlx",
    "D02T07": "shbzh",
    "D02T08": "nshjf",
    "D02T19": "gcjs",
    "D02T20": "swfw",
    "D02T21": "aqsc",
    "D02T22": "pczx",
    "D02T99": "qtz"
}
//组装请求参数
let packageRequestParams = (region) => {
    //事项分类
    let ql = document.querySelector(".xzsxflall").id || -1;
    //事项主题
    let theme = document.querySelector("#theme").value;
    let othertheme = themeMap[theme] || "";

    //搜索词
    let itemName = document.querySelector("#itemname").value;

    return {
        "xzqh": region,
        "orgcode": "",
        "citytype": "",
        "num": "",
        "theme": "",
        "keyword": itemName,
        "type": "",
        "ql": ql,
        "lb": "",
        "othertheme": othertheme
    };
}

//object to query string
let toQueryString = (paramObject) => {
    return Object
        .keys(paramObject)
        .filter(key => key != null && key != undefined)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(paramObject[key])}`)
        .join('&');
};
//在新标签页打开链接
let searchFromRegionInNewTab = (region) => {
    let baseUrl = "http://jnzwfw.sd.gov.cn/sdzw/items/lists/searchlist_new.do";
    let params = toQueryString(packageRequestParams(region));
    GM_openInTab(baseUrl + "?" + params, { insert: false });
}
//搜索所有区县
let searchAllRegions = async () => {
    let regions = await regionsOfJiNan(true);
    if (!regions) {
        return;
    }
    let itemName = document.querySelector("#itemname").value;
    if (!itemName) {
        alert("请输入事项名称");
        return;
    }

    regions.forEach(region => {
        if (!region) {
            return;
        }
        setTimeout(() => {
            searchFromRegionInNewTab(region.code);
        }, 20);
    });
}
/**
 * 插入搜索全部区县按钮
 */
let injectSearchAllButton = () => {
    if (document.querySelector("#searchFromAllRegions")) {
        return;
    }
    let button = `
    <tr height="54px">
        <td style="text-align: right;">
            <button class="submit1" style="font-size: 14px; height: 32px; margin-top: 0px; margin-right: 35px;" id=${SEARCH_ALL_REGIONS_BUTTON}>搜索全部区县</button>
        </td>
    </tr>
    `;
    let table = document.querySelector("#sxxzk > tbody");
    if(!table){
        return;
    }
    let row = table.insertRow();
    if (!row) {
        return;
    }
    row.innerHTML = button;
}

let start = () => {
    //插入按钮
    injectSearchAllButton();
}
/**
 * 延时执行脚本
 * @param {integer} interval 
 */
let startWithInterval = (interval) => {
    window.setTimeout(start, interval);
}

startWithInterval(1000);

document.onkeydown = function (e) {
    //按下 enter 键并且聚焦在 “按事项名称：” 后面的输入框内
    if (e.code && e.code.toLocaleLowerCase() === 'enter' && document.activeElement.id === ITEM_INPUT_ID) {
        //点击搜索键
        document.querySelector("#sxxzk > tbody > tr:nth-child(2) > td > input[type=image]:nth-child(5)").click();
    }
}
document.onclick = e => {
    //搜索全部区县 onclick
    if (e.target.id === SEARCH_ALL_REGIONS_BUTTON) {
        searchAllRegions();
    }
};