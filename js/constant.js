//const { xhr } = require("winjs")
const threshold = 1.15  //设置比较阈值
const BOARD_SIZE = 15   //棋盘大小
const PIECE_RADIUS = 13 //棋子半径
const COLOR_BOARD = '#d4b89b' //棋盘颜色
const COLOR_BOARD_LINE = '#000000' //棋盘线颜色
const COLOR_CUR_PIECE = '#FF0000' //当前落子标记颜色

//不同情况得分的具体数值对象
const Score = {
    LIVING_ONE: 10,
    LIVING_TWO: 100,
    LIVING_THREE: 1000,
    LIVING_FOUR: 100000,
    FIVE: 10000000,
    DEAD_ONE: 1,
    DEAD_TWO: 10,
    DEAD_THREE: 100,
    DEAD_FOUR: 10000
}

const MAX = Score.FIVE * 10	//极大值，必须大于最大情况下的得分
const MIN = -1 * MAX	//极小值

//角色对象
const Role = {
    ai: 1, //AI
    hum: 2, //玩家
    empty: 0,   //空位

    //角色转换函数
    reverse: function (r) {
        return r == 1 ? 2 : 1
    }
}

//配置信息
const config = {
    searchDeep: 10,  //搜索深度
    countLimit: 20, //gen函数返回的节点数量上限
    spreadLimit: 1,// 单步延伸 长度限制
    vcxDeep: 4  //算杀深度
}

/*移动方向数组
* ————————————————> x
  |
  |
  |
  |
  |
  |
  |
  y
*/
const movedir = [
    [1, 0], // 沿x方向移动
    [0, 1], // 沿y方向移动
    [1, 1], // 沿y=x方向移动
    [-1, 1] // 沿y=-x方向移动
]



