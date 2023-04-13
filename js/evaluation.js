/*
 * 获得某点得分，有可能该点并未落子，预先估算得分
 * @param b     棋盘board对象
 * @param nr    当前行数
 * @param nc    当前列数
 * @param role  当前角色    
 * @param dir   查找方向
 */
function getPointScore(b, nr, nc, role, dir) {

    let board = b.board
    let len = board.length
    let ret = 0
    //获得_dir方向的分数
    function getDirectScore(row, column, _dir) {
        let empty_pos = -1, cnt = 1, block = 0
        let ori_row = row, ori_column = column  //保存原位置
        
        //获得_dir方向上一侧的分数,isfirst=1代表该方向第一次计算,isfirst=0代表该方向另一侧已测过
        function getDirOnesideScore(isfirst) {
            while(true) {
                if (isfirst===true) {
                    row += movedir[_dir][0]
                    column += movedir[_dir][1]
                }
                else {
                    row -= movedir[_dir][0]
                    column -= movedir[_dir][1]                   
                }
                if (row >= len || column >= len || row < 0 || column < 0) {
                    ++block
                    break
                }
                let curr_piece = board[row][column]  //获取当前点的内容
                if (curr_piece === Role.empty) { //当前点为空，进行判断，搜索时最多有一个空
                    if (empty_pos == -1 && row + movedir[_dir][0] < len && column + movedir[_dir][1] < len 
                        && row + movedir[_dir][0] >= 0 && column + movedir[_dir][1] >= 0 
                        && board[row + movedir[_dir][0]][column + movedir[_dir][1]] == role) {
                        if (isfirst===true) {
                            empty_pos = cnt
                        }
                        else {
                            empty_pos = 0
                        }
                    }
                    else
                        break
                } 
                else if (curr_piece === role) { //当前点和原位置的角色相同
                    ++cnt
                    if (isfirst === false && empty_pos != -1) {
                        ++empty_pos
                    }
                } 
                else {
                    ++block
                    break
                }
            }
        }
        
        getDirOnesideScore(true)

        //沿_dir方向延申计算后，复原原坐标
        row = ori_row
        column = ori_column

        getDirOnesideScore(false)

        //缓存得分情况
        b.score_cache[role][_dir][ori_row][ori_column] = cntToScore(cnt, block, empty_pos)
        // ret += b.score_cache[role][_dir][ori_row][ori_column]
    }

    //如果未定义查找方向，则所有方向都查找
    if (dir === undefined) {
        for (let i = 0; i < movedir.length; ++i) {
            getDirectScore(nr, nc, i)
        }
    }
    //否则只查找相应方向
    else {
        getDirectScore(nr, nc, dir)
    }

    for (let i = 0; i < movedir.length; ++i) {
        ret += b.score_cache[role][i][nr][nc]
    }

    return ret
}

/*
 * 将查找到的相关信息计算得分
 * @param cnt   相同点的数量
 * @param block 两端阻塞情况
 * @param empty_pos 空位的位置
 */
function cntToScore(cnt, block, empty_pos) {
    if (empty_pos === undefined) empty_pos = 0
    if (empty_pos <= 0) { //如果没有空位
        if (cnt >= 5)
            return Score.FIVE
        if (block == 0) {
            switch (cnt) {
                case 1: return Score.LIVING_ONE
                case 2: return Score.LIVING_TWO
                case 3: return Score.LIVING_THREE
                case 4: return Score.LIVING_FOUR
            }
        }
        if (block == 1) {
            switch (cnt) {
                case 1: return Score.DEAD_ONE
                case 2: return Score.DEAD_TWO
                case 3: return Score.DEAD_THREE
                case 4: return Score.DEAD_FOUR
            }
        }
    } 
    else if (empty_pos === 1 || empty_pos == cnt - 1) {   //如果第1个是空位
        if (cnt >= 6) {
            return Score.FIVE
        }
        if (block === 0) {
            switch (cnt) {
                case 2: return Score.LIVING_TWO / 2
                case 3: return Score.LIVING_THREE
                case 4: return Score.DEAD_FOUR
                case 5: return Score.LIVING_FOUR
            }
        }
        if (block === 1) {
            switch (cnt) {
                case 2: return Score.DEAD_TWO
                case 3: return Score.DEAD_THREE
                case 4: return Score.DEAD_FOUR
                case 5: return Score.DEAD_FOUR
            }
        }
    } 
    else if (empty_pos === 2 || empty_pos == cnt - 2) {   //如果第2个是空位
        if (cnt >= 7) {
            return Score.FIVE
        }
        if (block === 0) {
            switch (cnt) {
                case 3: return Score.LIVING_THREE
                case 4:
                case 5: return Score.DEAD_FOUR
                case 6: return Score.LIVING_FOUR
            }
        }
        if (block === 1) {
            switch (cnt) {
                case 3: return Score.DEAD_THREE
                case 4: return Score.DEAD_FOUR
                case 5: return Score.DEAD_FOUR
                case 6: return Score.LIVING_FOUR
            }
        }
        if (block === 2) {
            switch (cnt) {
                case 4:
                case 5:
                case 6: return Score.DEAD_FOUR
            }
        }
    } 
    else if (empty_pos === 3 || empty_pos == cnt - 3) {   //如果第3个是空位
        if (cnt >= 8) {
            return Score.FIVE
        }
        if (block === 0) {
            switch (cnt) {
                case 4:
                case 5: return Score.LIVING_THREE
                case 6: return Score.DEAD_FOUR
                case 7: return Score.LIVING_FOUR
            }
        }

        if (block === 1) {
            switch (cnt) {
                case 4:
                case 5:
                case 6: return Score.DEAD_FOUR
                case 7: return Score.LIVING_FOUR
            }
        }

        if (block === 2) {
            switch (cnt) {
                case 4:
                case 5:
                case 6:
                case 7: return Score.DEAD_FOUR
            }
        }
    } 
    else if (empty_pos === 4 || empty_pos == cnt - 4) {   //如果第4个是空位
        if (cnt >= 9) {
            return Score.FIVE
        }
        if (block === 0) {
            switch (cnt) {
                case 5:
                case 6:
                case 7:
                case 8: return Score.LIVING_FOUR
            }
        }

        if (block === 1) {
            switch (cnt) {
                case 4:
                case 5:
                case 6:
                case 7: return Score.DEAD_FOUR//这里有一种情况不会出现，所以是没错的
                case 8: return Score.LIVING_FOUR
            }
        }

        if (block === 2) {
            switch (cnt) {
                case 5:
                case 6:
                case 7:
                case 8: return Score.DEAD_FOUR
            }
        }
    } 
    else if (empty_pos === 5 || empty_pos == cnt - 5) {   //如果第5个是空位
        return Score.FIVE
    }
    return 0    //其他情况都返回0
}