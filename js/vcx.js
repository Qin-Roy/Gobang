/*
 * 算杀
 * 算杀的原理和极大极小值搜索是一样的
 * 不过算杀只考虑冲四活三这类对方必须防守的棋
 * 因此算杀的复杂度虽然是 M^N ，但是底数M特别小，可以算到16步以上的杀棋。
 * VCT 连续活三胜
 * VCF 连续冲四胜利
 */

/*
 * 基本思路
 * AI有活三或者冲四，认为是玩家必须防守的
 * 玩家防守的时候却不一定根据AI的棋来走，而是选择走自己最好的棋，比如有可能是自己选择冲四
 */
var vcxcache = {
    vct: {},
    vcf: {}
}

var MAX_SCORE = Score.LIVING_THREE
var MIN_SCORE = Score.LIVING_FOUR

/*
var debugCheckmate = debug.checkmate = {
    cacheCount: 0, // cache 总数
    totalCount: 0, // 算杀总数
    cacheHit: 0, // 缓存命中
}
*/

var lastMaxPoint, lastMinPoint

//找到所有比目标分数大的位置
//注意，不止要找自己的，还要找对面的，
var findMax = function(role, score) {
    var result = [], fives = []
    for (let i = 0;i < board.length; i++) {
        for (let j = 0;j < board[i].length; j++) {
            if (board[i][j] == Role.empty) {
                var p = [i, j]
                // 注意，防一手对面冲四
                // 所以不管谁能连成五，先防一下。
                if (board.hum_score[p[0]][p[1]] >= Score.FIVE) {
                    p.score = Score.FIVE
                    if (role === Role.ai) 
                        p.score *= -1
                    fives.push(p)
                } 
                else if (board.ai_score[p[0]][p[1]] >= Score.FIVE) {
                    p.score = Score.FIVE
                    if (role === Role.hum) 
                        p.score *= -1
                    fives.push(p)
                } 
                else {
                    if ( (!lastMaxPoint || (i === lastMaxPoint[0] || j === lastMaxPoint[1] || (Math.abs(i-lastMaxPoint[0]) === Math.abs(j-lastMaxPoint[1]))))) {
                        var s = (role == Role.ai ? board.ai_score[p[0]][p[1]] : board.hum_score[p[0]][p[1]])
                        p.score = s
                        if(s >= score) {
                            result.push(p)
                        }
                    }
                }
            }
        }
    }
    // 能连五，则直接返回
    // 但是注意不要碰到连五就返回，而是把所有连五的点都考虑一遍，不然可能出现自己能连却防守别人的问题
    if (fives.length) 
        return fives
    //注意对结果进行排序
    result.sort(function(a, b) {
        return b.score - a.score
    })
    return result
}


// MIN层
//找到所有比目标分数大的位置
//这是MIN层，所以己方分数要变成负数
var findMin = function(role, score) {
    var result = []
    var fives = []
    var fours = []
    var deadfours = []
    for (let i = 0;i < board.length; i++) {
        for (let j = 0;j < board[i].length; j++) {
            if (board[i][j] == Role.empty) {
                var p = [i, j]
                var s1 = (role == Role.ai ? board.ai_score[p[0]][p[1]] : board.hum_score[p[0]][p[1]])
                var s2 = (role == Role.ai ? board.hum_score[p[0]][p[1]] : board.ai_score[p[0]][p[1]])
                if (s1 >= Score.FIVE) {
                    p.score = - s1
                    return [p]
                } 
              
                if (s2 >= Score.FIVE) {
                    p.score = s2
                    fives.push(p)
                    continue
                } 
              
                if (s1 >= Score.LIVING_FOUR) {
                    p.score = -s1
                    fours.unshift(p)
                    continue
                }
                if (s2 >= Score.LIVING_FOUR) {
                    p.score = s2
                    fours.push(p)
                    continue
                }
              
                if (s1 >= Score.DEAD_FOUR) {
                    p.score = -s1
                    deadfours.unshift(p)
                    continue
                }
              
                if (s2 >= Score.DEAD_FOUR) {
                    p.score = s2
                    deadfours.push(p)
                    continue
                }
              
                if (s1 >= score || s2 >= score) {
                    p = [i, j]
                    p.score = s1
                    result.push(p)
                }
            }
        }
    }
    if (fives.length) 
        return fives
    // 注意冲四，因为虽然冲四的分比活四低，但是他的防守优先级是和活四一样高的，否则会忽略冲四导致获胜的走法
    if(fours.length) 
        return fours.concat(deadfours)
  
    //注意对结果进行排序
    //因为fours可能不存在，这时候不要忽略了 deadfours
    result = deadfours.concat(result)
    result.sort(function(a, b) {
        return Math.abs(b.score) - Math.abs(a.score)
    })
    return result
}

var max = function(role, deep) {
    //debugNodeCount ++
    //board.logSteps()
    if (deep <= 1) 
        return false
    var points = findMax(role, MAX_SCORE)
    if (points.length && points[0].score >= Score.LIVING_FOUR) 
        return [points[0]] //为了减少一层搜索，活四就行了。
    if (points.length == 0) 
        return false
    for (let i = 0;i < points.length; i++) {
        var p = points[i]
        board.put(p, role)
        // 如果是防守对面的冲四，那么不用记下来
        if (!p.score <= -Score.FIVE) 
            lastMaxPoint = p
        var m = min(Role.reverse(role), deep-1)
        board.remove(p)
        if (m) {
            if(m.length) {
                m.unshift(p) //注意 unshift 方法返回的是新数组长度，而不是新数组本身
                return m
            } 
            else {
                return [p]
            }
        }
    }
    return false
}


//只要有一种方式能防守住，就可以了
var min = function(role, deep) {
    //debugNodeCount ++
    var w = board.win()
    //board.logSteps()
    if(w == role) 
        return false
    if(w == Role.reverse(role)) 
        return true
    if(deep <= 1) 
        return false
    var points = findMin(role, MIN_SCORE)
    if (points.length == 0) 
        return false
    if (points.length && -1 * points[0].score  >= Score.LIVING_FOUR) 
        return false //为了减少一层搜索，活四就行了。
    var cands = []
    for (let i = 0;i < points.length; i++) {
        var p = points[i]
        board.put(p, role)
        lastMinPoint = p
        var m = max(Role.reverse(role), deep-1)
        board.remove(p)
        if (m) {
            m.unshift(p)
            cands.push(m)
            continue
        } 
        else {
            return false //只要有一种能防守住
        }
    }
    var result = cands[Math.floor(cands.length*Math.random())]  //无法防守住
    return result
}

var cache_f = function(result, isvcf) {
    if (isvcf) 
        vcxcache.vcf[zobrist.code] = result
    else 
        vcxcache.vct[zobrist.code] = result
    //debugCheckmate.cacheCount ++
}

var getCache = function(isvcf) {
    //debugCheckmate.totalCount ++
    var result
    if (isvcf) 
        result = vcxcache.vcf[zobrist.code]
    else 
        result = vcxcache.vct[zobrist.code]
    //if (result) debugCheckmate.cacheHit ++
    return result
}

//迭代加深
var deeping = function(role, deep, totalDeep) {
    for(let i=1;i<=deep;i++) {
        lastMaxPoint = undefined
        lastMinPoint = undefined
        var result = max(role, i, deep)
        if (result) 
            break //找到一个就行
    }
    if(result) {
        console.log("算杀成功" + JSON.stringify(result));
    }
    return result
}

var vcx = function(role, deep, onlyFour) {

    deep = deep === undefined ? config.vcxDeep : deep
  
    if(deep <= 0) 
        return false

    if (onlyFour) {
        //计算冲四赢的
        MAX_SCORE = Score.DEAD_FOUR
        MIN_SCORE = Score.FIVE

        var result = deeping(role, deep, deep)
        if (result) {
            result.score = Score.LIVING_FOUR
            console.log("算杀成功")
            return result
        }
        return false
    } 
    else {
        //计算通过 活三 赢的；
        MAX_SCORE = Score.LIVING_THREE
        MIN_SCORE = Score.DEAD_FOUR
        result = deeping(role, deep, deep)
        if(result) {
            result.score = Score.LIVING_THREE*2 //连续冲三赢，就等于是双三
            console.log("算杀成功")
            return result
        }
        return false
    }
}

// 连续冲四
var vcf = function (role, deep) {
    var c = getCache(true)
    if (c) 
        return c
    var result = vcx(role, deep, true)
    cache_f(result, true)
    return result
}

// 连续活三
var vct = function (role, deep) {
    var c = getCache()
    if (c) 
        return c
    var result = vcx(role, deep, false)
    cache_f(result)
    return result
}