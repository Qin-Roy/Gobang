var Cache = {}
var cacheCount = 0 //zobrist缓存节点数
var cacheGet = 0 //zobrist缓存命中数量
/*
 * 极小极大搜索的递归部分
 * @param deep	搜索深度
 * @param alpha alpha值
 * @param beta	beta值
 * @param role	当前层角色
 * @param step	记录当前已搜索层数
 * @param steps	候选搜索点数组
 * @param spread	当前已进行的冲四延申次数
 */
function recursion(deep, alpha, beta, role, step, steps, spread) {
	var c = Cache[board.zobrist.code]
	if (c) {
	  	if(c.deep >= deep) { // 如果缓存中的结果搜索深度不比当前小，则结果完全可用
			cacheGet ++
			// 记得clone，因为这个分数会在搜索过程中被修改，会使缓存中的值不正确
			return {
		 		score: c.score.score,
		  		steps: steps,
		  		step: step + c.score.step,
		  		c: c
			}
		}
	}

	let cur_score = board.evaluate(role)	//当前的局势分
	//当前节点情况
	let leaf = {
		score: cur_score,
		step: step,
		steps: steps
	}

	//如果搜索到限制层数或搜索到的结果已获胜则返回当前节点
	if (deep <= 0 || calc.greaterThanOrEqual(cur_score, Score.FIVE) || calc.lessThanOrEqual(cur_score, -Score.FIVE)) {
		// vcf
  		// 自己没有形成活四，对面也没有形成活四，那么先尝试VCF
  		if(calc.lessThan(cur_score, Score.LIVING_FOUR) && calc.greaterThan(cur_score, Score.LIVING_FOUR * -1)) {
			mate = vcf(role, config.vcxDeep)
		
  	  		if (mate) {
				console.log('vcf success')
  	    		v = {
  	      			score: mate.score,
  	      			step: step + mate.length,
  	      			steps: steps,
  	      			vcf: mate // 一个标记为，表示这个值是由vcx算出的
  	    		}
  	    	return v
  	  		}
  		} 
		// vct
  		// 自己没有形成活三，对面也没有高于活三的棋型，那么尝试VCT
  		if(calc.lessThan(cur_score, Score.LIVING_THREE*2) && calc.greaterThan(cur_score, Score.LIVING_THREE * -2)) {
			var mate = vct(role, config.vcxDeep)

  		  	if(mate) {
				console.log('vct success')
  		    	v = {
  		      		score: mate.score,
  		      		step: step + mate.length,
  		      		steps: steps,
  		      		vct: mate // 一个标记为，表示这个值是由vcx算出的
  		    	}
  		  		return v
  		  	}
		}	
		return leaf
	}
	
	let ret = {
		score: MIN,
		step: step,
		steps: steps
	}

	//let points = board.gen(role, step > 2)	//获得所有要考虑的点
	let points = board.gen(role, board.count > 10 ? step > 1 : step > 3, step > 1)

	if (!points.length) return leaf

	for (let i = 0; i < points.length; i++) {
		let p = points[i]
		board.put(p, role)
		let _deep = deep - 1
		let _spread = spread

		//如果对方已经能获胜，则尝试冲四延伸
		if (_spread < config.spreadLimit) {
			if ((role == Role.ai && p.scoreHum >= Score.FIVE) || (role == Role.hum && p.scoreCom >= Score.FIVE)) {
				_deep += 2
				_spread++
			}
		}

		let _steps = steps.slice(0)
		_steps.push(p)
		let v = recursion(_deep, -beta, -alpha, Role.reverse(role), step + 1, _steps, _spread)
		v.score *= -1
		board.remove(p)

		//更新ret
		if (v.score > ret.score) {
			ret = v
		}

		//alpha剪枝，更新alpha值
		alpha = Math.max(ret.score, alpha)

		//beta剪枝
		if (calc.greaterThan(v.score, beta)) {
			v.score = MAX - 1	//该点被剪枝，用极大值记录
			v.abcut = 1
			return v
		}
	}
	cache(deep,ret)

	return ret
}

var cache = function(deep, Score) {
	if (Score.abcut) 
		return false // 被剪枝的不要缓存哦，因为分数是一个极值
	// 记得clone，因为score在搜索的时候可能会被改的，这里要clone一个新的
	var obj = {
	  	deep: deep,
	  	score: {
			score: Score.score,
			steps: Score.steps,
			step: Score.step
	  	},
	  	board: board.toString()
	}
	Cache[board.zobrist.code] = obj
	//console.log('add cache[' + board.zobrist.code + ']', obj)
	cacheCount++
  }

/*
 * 极小极大搜索函数(的第一层)
 * @param candidates	参与考虑的结点
 * @param role	当前层角色
 * @param deep	搜索深度
 * @param alpha alpha值
 * @param beta	beta值
 */
function negamax(candidates, role, deep, alpha, beta) {
	board.current_steps = []	//清空当前搜索数组

	for (let i = 0; i < candidates.length; ++i) {
		let p = candidates[i]
		board.put(p, role)
		let steps = [p]
		let v = recursion(deep - 1, -beta, -alpha, Role.reverse(role), 1, steps.slice(0), 0)
		v.score *= -1
		alpha = Math.max(alpha, v.score)
		board.remove(p)
		p.score = v.score
		p.step = v.step
		p.steps = v.steps
	}

	return alpha	//返回alpha值，即为返回了最大得分
}

/*
 * 寻找最优方案
 * @param deep	搜索总深度
 */
function searchMethod(deep) {
	deep = deep === undefined ? config.searchDeep : deep
	const role = Role.ai	//进行搜索的角色一定是AI
	const candidates = board.gen(role)	//选出当前局面的参考结点
	let best_score	//当前搜索最佳得分

	for (let i = 2; i <= deep; i += 2) {
		best_score = negamax(candidates, role, i, MIN, MAX)
		if (calc.greaterThanOrEqual(best_score, Score.FIVE)) 
			break
	}

	let ret = candidates[0]
	for (let i = 1; i < candidates.length; ++i) {
		if (calc.equal(ret.score, candidates[i].score)) {
			// 大于0是优势，尽快获胜，因此取步数短的
			if (ret.score >= 0 && (ret.step > candidates[i].step || (ret.step == candidates[i].step && ret.score < candidates[i].score))) {
				ret = candidates[i]
			}
			// 小于0是劣势，尽量拖延，因此取步数长的
			else if (ret.step < candidates[i].step || (ret.step == candidates[i].step && ret.score < candidates[i].score)) {
				ret = candidates[i]
			}
		} 
		else if (ret.score < candidates[i].score) {	//如果得分不同直接取得分高的
			ret = candidates[i]
		}
	}

	return ret
}