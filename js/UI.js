let canvas = document.getElementById("chessboard")  //初始化画布
let context = canvas.getContext("2d")   //画布绘制类型
let piece_is_black //true表示当前落子为黑色，false表示为白色
let cur_role //当前角色信息
let init_finish = false   //是否完成初始化

//绘制相关函数封装成DRAW类
class DRAW {
    /*
    * 清空棋盘画布，将画布上的棋子及格线擦除
    */
    cleanBoard() {
        //设置按钮的可见性
        document.getElementsByName("meFirst")[0].style.cssText = "display:inline-block;"
        document.getElementsByName("computerFirst")[0].style.cssText = "display:inline-block;"
        document.getElementsByName("restart")[0].style.cssText = "display:none;"
        document.getElementsByName("goBack")[0].style.cssText = "display:none;"

        //填充背景颜色
        context.fillStyle = COLOR_BOARD
        context.fillRect(0, 0, canvas.width, canvas.height)
        this.drawBoardLines()    //绘制棋盘线
        this.drawBoardPoints()   //绘制棋盘点
    }

    /*
    * 绘制线
    * @param x_begin   起点x坐标
    * @param y_begin   起点y坐标
    * @param x_end     终点x坐标
    * @param y_end     终点y坐标
    * @param line_width    线宽度
    * @param line_color    线颜色
    */
    paintLine(x_begin, y_begin, x_end, y_end, line_width = 1, line_color) {
        context.lineWidth = line_width  //设置线宽度
        //画线
        context.strokeStyle = line_color
        context.beginPath()
        context.moveTo(x_begin, y_begin)
        context.lineTo(x_end, y_end)
        context.closePath()
        context.stroke()
    }

    /*
    * 绘制棋盘线
    */
    drawBoardLines() {
        //循环绘制横线和竖线
        for (let i = 0; i < BOARD_SIZE; i++) {
            const nx = 15 + i * 30
            this.paintLine(nx, 15, nx, canvas.height - 15, 1, COLOR_BOARD_LINE)
            this.paintLine(15, nx, canvas.height - 15, nx, 1, COLOR_BOARD_LINE)
        }
    }

    /*
    * 绘制点
    * @param i     棋子在棋盘上x轴坐标
    * @param j     棋子在棋盘上y轴坐标
    */
    drawPoint(i,j){
        context.beginPath()
        context.arc(15 + i * 30, 15 + j * 30, 4, 0, 2 * Math.PI)
        context.closePath()
        context.fillStyle = "black"
        context.fill()
    }

    /*
    * 绘制棋盘上五个星位
    */
    drawBoardPoints() {
        this.drawPoint(3,3)
        this.drawPoint(11,3)
        this.drawPoint(7,7)
        this.drawPoint(3,11)
        this.drawPoint(11,11)
    }

    /*
    * 绘制棋子
    * @param i     棋子在棋盘上x轴坐标
    * @param j     棋子在棋盘上y轴坐标
    * @param piece_color 棋子颜色
    */
    paintPiece(i, j, piece_color) {
        //计算棋子圆心在画布上坐标
        const nr = 15 + i * 30, nc = 15 + j * 30
    
        context.beginPath()
        context.arc(nr, nc, PIECE_RADIUS, 0, 2 * Math.PI)
        context.closePath()
         //设置渐变填充效果
        let gradient = context.createRadialGradient(nr + 2, nc - 2, PIECE_RADIUS, nr + 2, nc - 2, 0)   
        if (piece_color) {
            //绘制黑棋
            gradient.addColorStop(0, "#0A0A0A")
            gradient.addColorStop(1, "#636766")
        } 
        else {
            //绘制白棋
            gradient.addColorStop(0, "#D1D1D1")
            gradient.addColorStop(1, "#F9F9F9")
        }
        context.fillStyle = gradient
        context.fill()
    }

    /*
    * 当前落子标记
    * @param i               棋子在棋盘上x轴坐标
    * @param j               棋子在棋盘上y轴坐标
    * @param uncur           是否不为当前落子
    * @param piece_is_black     棋子颜色是否为黑色
    */
    markPiece(i, j, uncur, piece_is_black) {
        //计算棋子圆心在画布上坐标
        const nr = 15 + i * 30, nc = 15 + j * 30

        if (!uncur) {    //解除标记
            context.lineWidth = 2
            context.strokeStyle = COLOR_CUR_PIECE
        } 
        else {    //标记
            context.lineWidth = 3
            context.strokeStyle = COLOR_BOARD
        }
        context.beginPath()
        context.arc(nr, nc, PIECE_RADIUS + 1, 0, 2 * Math.PI)
        context.closePath()
        context.stroke()

        if (uncur) { 
            //解除标记需要补黑线和棋子边框，否则显示效果不好
            this.paintLine(nr, nc - PIECE_RADIUS - 3, nr, nc - PIECE_RADIUS, 1, COLOR_BOARD_LINE)
            this.paintLine(nr, nc + PIECE_RADIUS + 3, nr, nc + PIECE_RADIUS, 1, COLOR_BOARD_LINE)
            this.paintLine(nr - PIECE_RADIUS - 3, nc, nr - PIECE_RADIUS, nc, 1, COLOR_BOARD_LINE)
            this.paintLine(nr + PIECE_RADIUS + 3, nc, nr + PIECE_RADIUS, nc, 1, COLOR_BOARD_LINE)

            context.lineWidth = 2
            if (piece_is_black == true)  //棋子是黑色
                context.strokeStyle = "#0A0A0A"
            else
                context.strokeStyle = "#D1D1D1"
            context.beginPath()
            context.arc(nr, nc, PIECE_RADIUS - 1, 0, 2 * Math.PI)
            context.closePath()
            context.stroke()
        }
    }

    /*
    * 执行一步棋
    * @param i     棋子在棋盘上x轴坐标
    * @param j     棋子在棋盘上y轴坐标
    */
    oneStep(i, j) {
        this.paintPiece(i, j, piece_is_black)   //绘制棋子

        //解除上一步的标记
        if (board.all_steps.length >= 1) {
            let last_p = board.all_steps[board.all_steps.length - 1]
            this.markPiece(last_p[0], last_p[1], true, !piece_is_black)
        }
        let p = [i, j]
        board.put(p, cur_role)
        this.markPiece(i, j, false)    //标记

        //判断是否结束
        if (isOver(i, j)) {
            setTimeout(function () { alert(cur_role == Role.hum ? "玩家获胜！" : "AI获胜！") }, 10)   //设置延时，防止卡顿
            init_finish = false
            document.getElementsByName("goBack")[0].style.cssText = "display:none;"
        }

        //反转下一步棋子颜色和角色
        if (init_finish) {
            piece_is_black = !piece_is_black
            cur_role = Role.reverse(cur_role)
        }
    }
}

/*
 * 根据点击“AI先手”或“玩家先手”初始化棋盘
 * @param ai_first 判断AI是否先手
 */
function initGame(ai_first) {
    board.init(BOARD_SIZE)  //初始化棋盘
    draw.cleanBoard()    //清除棋盘
    piece_is_black = ai_first ? false : true  //设定第一步棋子的颜色，保持AI执白棋，人执黑棋
    draw.drawBoardLines()    //绘制棋盘线
    draw.drawBoardPoints()   //绘制棋盘点

    //设置按钮的可见性
    document.getElementsByName("meFirst")[0].style.cssText = "display:none;"
    document.getElementsByName("computerFirst")[0].style.cssText = "display:none;"
    document.getElementsByName("restart")[0].style.cssText = "display:inline-block;"
    document.getElementsByName("goBack")[0].style.cssText = "display:inline-block;"

    init_finish = true    //完成初始化

    if (ai_first) {
        //若AI先行，第一步在中心处下棋
        cur_role = Role.ai
        draw.oneStep(7, 7)
    } 
    else {
        cur_role = Role.hum
    }
}
/*
 * 游戏是否结束
 * @param r     棋子在棋盘上x轴坐标
 * @param c     棋子在棋盘上y轴坐标
 */
function isOver(r, c) {
    //行列移动方式数组
    const mov_r = [0, 1, 1, 1]
    const mov_c = [1, 0, 1, -1]

    const role = board.board[r][c]  //当前角色

    //循环查找有无5子相连
    for (let i = 0; i < mov_r.length; i++) {
        let cnt = 1
        for (let j = 1; j <= 4; j++) {
            let nr = r + j * mov_r[i]
            let nc = c + j * mov_c[i]

            //遇到出界或非当前角色的格子即退出循环
            if (nr >= BOARD_SIZE || nr < 0 || nc >= BOARD_SIZE || nc < 0 || board.board[nr][nc] != role) {
                break
            }
            ++cnt
        }
        for (let j = 1; j <= 4; j++) {
            let nr = r - j * mov_r[i]
            let nc = c - j * mov_c[i]

            //遇到出界或非当前角色的格子即退出循环
            if (nr >= BOARD_SIZE || nr < 0 || nc >= BOARD_SIZE || nc < 0 || board.board[nr][nc] != role) {
                break
            }
            ++cnt
        }
        if (cnt >= 5) {
            return true
        }
    }
    return false
}

/*
 * 鼠标点击函数，进行下棋操作
 * @param e 鼠标点击事件
 */
canvas.onclick = function (e) {
    if (cur_role != Role.hum || init_finish == false)
        return

    //获得点击坐标并计算格线上的坐标
    let x = e.offsetX
    let y = e.offsetY
    let i = Math.floor(x / 30)
    let j = Math.floor(y / 30)


    if (board.board[i][j] == Role.empty) { // 如果该位置没有棋子，则允许落子
        //落子
        draw.oneStep(i, j)

        //设置延时，防止卡顿
        setTimeout(function () {
            if (init_finish) {
                //搜索AI策略
                let p = searchMethod()
                console.log('得分为：' + p.score)   //输出得分用于调试
                //AI落子
                draw.oneStep(p[0], p[1])
            }
        }, 1)
    }
}

/*
* 悔棋的绘图操作，填充空白
* @param i     棋子在棋盘上x轴坐标
* @param j     棋子在棋盘上y轴坐标
*/
function removePiece(i, j) {
    //计算棋子圆心在画布上坐标
    const nr = 15 + i * 30, nc = 15 + j * 30

    //填充背景色圆圈
    context.beginPath()
    context.arc(nr, nc, PIECE_RADIUS + 3, 0, 2 * Math.PI)
    context.closePath()
    let gradient = context.createRadialGradient(nr + 2, nc - 2, PIECE_RADIUS, nr + 2, nc - 2, 0)
    gradient.addColorStop(1, COLOR_BOARD)
    context.fillStyle = gradient
    context.fill()

    //补绘黑线
    draw.paintLine(nr, nc - PIECE_RADIUS - 3, nr, nc + PIECE_RADIUS + 3, 1, COLOR_BOARD_LINE)
    draw.paintLine(nr - PIECE_RADIUS - 3, nc, nr + PIECE_RADIUS + 3, nc, 1, COLOR_BOARD_LINE)
}

/*
* 悔棋操作，调用removePiece
*/
function goBack() {
    //若不能悔棋(到达开始位置)，直接返回
    if (board.all_steps.length < 2)
        return
    //清楚画布棋子
    for (let i = 1; i <= 2; ++i) {
        p = board.all_steps[board.all_steps.length - i]
        removePiece(p[0], p[1])
    }
    //board退步操作
    board.backward()
}

let draw = new DRAW()
draw.cleanBoard()
draw.drawBoardLines()
draw.drawBoardPoints()


