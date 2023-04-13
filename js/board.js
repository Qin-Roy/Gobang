
/*
 * 判断是否符合star spread的要求
 * @param point 	当前棋子
 * @param points	棋子序列
 */
function starJudge(point, points) {
	if (!points || !points.length) 
		return false
	const m = point
	for (let i = 0;i < points.length;i++) {
	 	// 距离必须在5步以内，否则直接return false
	  	const n = points[i]
	  	if ((Math.abs(m[0]-n[0]) > 4 || Math.abs(m[1]-n[1]) > 4)) 
			return false
	  	// 必须在米字方向上，否则直接return false
	  	if ( !(m[0] === n[0] || m[1] === n[1] || (Math.abs(m[0]-n[0]) === Math.abs(m[1]-n[1]))) ) 
		  	return false
	}
	return true
}
/*
 * 修复分数，使判断更合理
 * @param score		原始分值
 */
function fixScore(score) {
	if (score < Score.LIVING_FOUR && score >= Score.DEAD_FOUR) {
		if (score >= Score.DEAD_FOUR && score < Score.DEAD_FOUR + Score.LIVING_THREE) {
			return Score.LIVING_THREE	//单独冲四，意义不大
		} 
		else if (score >= Score.DEAD_FOUR + Score.LIVING_THREE && score < Score.DEAD_FOUR * 2) {
			return Score.LIVING_FOUR	//冲四活三，得分相当于自己形成活四
		} 
		else {
			return Score.LIVING_FOUR * 2	//双冲四，分数提高
		}
	}
	return score
}

//board棋盘类
class Board {
	/*
	 * 初始化棋盘函数
	 * @param size	棋盘大小
	 */
	init(size) {
		this.current_steps = []	//当前搜索的步骤
		this.all_steps = []		//总步骤
		this.count = 0	//已落子数量
		this.board = array.create(size, size)	//棋盘信息二维数组
		this.size = size	//棋盘大小
		this.ai_score = array.create(size, size)	//AI得分
		this.hum_score = array.create(size, size)	//玩家得分
		this.zobrist = zobrist
		zobrist.init()
		// score_cache[role][dir][row][col]
		this.score_cache = [
			[],
			[
				array.create(size, size),
				array.create(size, size),
				array.create(size, size),
				array.create(size, size)
			],
			[
				array.create(size, size),
				array.create(size, size),
				array.create(size, size),
				array.create(size, size)
			]
		]
	}

	/*
	 * 更新一个点附近的分数
	 * @param p		描述棋子的对象
	 */
	updateScore(p) {
		const radius = 4	//更新范围，只考虑米字型且距离不超过4的点
		let self = this,	//为了内层函数正常访问外层this，先将外层this存起来
			board = this.board,
			len = this.board.length

		//更新一个位置的得分
		function update(row, column, dir) {
			let role = board[row][column]
			if (role == Role.hum) {
				self.ai_score[row][column] = 0
				self.hum_score[row][column] = getPointScore(self, row, column, Role.hum, dir)
			}
			else if (role == Role.ai) {
				self.hum_score[row][column] = 0
				self.ai_score[row][column] = getPointScore(self, row, column, Role.ai, dir)
			}
			else {
				self.hum_score[row][column] = getPointScore(self, row, column, Role.hum, dir)
				self.ai_score[row][column] = getPointScore(self, row, column, Role.ai, dir)
			}
		}

		for (let i = 0; i < movedir.length; ++i) { //米字形四个方向轴
			for (let j = -radius; j <= radius; ++j) { //距离不超过4
				let row = p[0] + j * movedir[i][0], column = p[1] + j * movedir[i][1]	//计算要更新分数的棋子位置
				if (row < 0 || row >= len || column < 0 || column >= len || board[row][column] != Role.empty)
					continue
				update(row, column, i)
			}
		}
	}

	/*
	 * 落子
	 * @param p		描述棋子的对象
	 * @param role	当前角色
	 */
	put(p, role) {
		this.board[p[0]][p[1]] = role
		this.zobrist.go(p[0], p[1], role)
		this.updateScore(p)
		this.all_steps.push(p)
		this.current_steps.push(p)
		this.count++
	}

	/*
	 * 移除棋子
	 * @param p		描述棋子的对象
	 */
	remove(p) {
		this.zobrist.go(p[0], p[1], this.board[p[0]][p[1]])
		this.board[p[0]][p[1]] = Role.empty
		this.updateScore(p)
		this.all_steps.pop()
		this.current_steps.pop()
		this.count--
	}

	/*
	 * 回退(悔棋)
	 */
	backward() {
		if (this.all_steps.length < 2) {
			return
		}
		for (let i = 0; i < 2; ++i) {
			let p = this.all_steps[this.all_steps.length - 1]
			this.remove(p)
		}
	}

	/*
	 * 为某一角色估分
	 * @param role	当前角色
	 */
	evaluate(role) {
		let ai_sum_score = 0
		let hum_sum_score = 0
		let board = this.board

		for (let i = 0; i < board.length; ++i) {
			for (let j = 0; j < board[i].length; ++j) {
				if (board[i][j] == Role.ai) {
					ai_sum_score += fixScore(this.ai_score[i][j])
				} else if (board[i][j] == Role.hum) {
					hum_sum_score += fixScore(this.hum_score[i][j])
				}
			}
		}

		return (role == Role.ai ? 1 : -1) * (ai_sum_score - hum_sum_score)
	}

	/*
	 * 启发函数，获得所有可能要考虑的落子位置
	 * @param role	当前角色
	 * @param only_threes	是否只返回>=3的位置
	 * @param star_spread	是否只返回米字形方向的位置
	 */
	
	gen(role, only_threes,star_spread) {
		//游戏尚未开始，直接返回棋盘中点
		if (this.count <= 0) return [7, 7]

		let fives = []  //连五
		let ailivingfours = [] //AI连四
		let humlivingfours = [] //玩家连四
		let aideadfours = []  //AI眠四
		let humdeadfours = []  //玩家眠四
		let aitwo_threes = [] //AI双三
		let humtwo_threes = [] //玩家双三
		let ailivingthrees = []  //AI活三
		let humlivingthrees = []  //玩家活三
		let ailivingtwos = []  //AI活二
		let humlivingtwos = []  //玩家活二
		let neighbors = []  //记录搜索范围
		const attackloca = [] // 进攻点
		const defendloca = [] // 防守点
		let board = this.board
		let opporole = Role.reverse(role)

		//
		if (star_spread) {
			let i = this.current_steps.length - 1
			while(i >= 0) {
			  	let piece = this.current_steps[i]
			  	if (opporole === Role.ai && piece.score_ai >= Score.THREE 
					|| opporole === Role.hum && piece.score_hum >= Score.THREE) {
					defendloca.push(piece)
					break
			  	}
			  	i -= 2
			}
			i = this.current_steps.length - 2
			while(i >= 0) {
			  	let piece = this.current_steps[i]
			  	if (role === Role.ai && piece.score_ai >= Score.THREE
					|| role === Role.hum && piece.score_hum >= Score.THREE) {
					attackloca.push(piece)
					break
			  	}
			  	i -= 2
			}
			if (!attackloca.length) 
				attackloca.push(this.current_steps[0].role === role ? this.current_steps[0] : this.current_steps[1])
			if (!defendloca.length) 
				defendloca.push(this.current_steps[0].role === opporole? this.current_steps[0] : this.current_steps[1])
		}

		for (let i = 0; i < board.length; ++i) {
			for (let j = 0; j < board[i].length; ++j) {
				if (board[i][j] == Role.empty) {	//该点目前为空，可以考虑
					if (!this.hasNeighbour(i, j, 2, 1)) continue

					let score_hum = this.hum_score[i][j]
					let score_ai = this.ai_score[i][j]
					let max_score = Math.max(score_ai, score_hum)

					if (only_threes && max_score < Score.LIVING_THREE) continue

					let p = [i, j]
					p.score_hum = score_hum
					p.score_ai = score_ai
					p.score = max_score
					p.role = role

					//
					if (star_spread) {		
						if (max_score >= Score.FOUR)
							;
						else if (max_score >= Score.BLOCKED_FOUR && starJudge(this.current_steps[this.current_steps.length-1]) ) 
						//star 路径不是很准，所以考虑冲四防守对手最后一步的棋
							;
						else if (starJudge(p, attackloca) || starJudge(p, defendloca) ) 
							;
						else {
						  continue
						}
					}
					//
					if (score_ai >= Score.FIVE) {
						fives.push(p)
					} else if (score_hum >= Score.FIVE) {
						fives.push(p)
					} else if (score_ai >= Score.LIVING_FOUR) {
						ailivingfours.push(p)
					} else if (score_hum >= Score.LIVING_FOUR) {
						humlivingfours.push(p)
					} else if (score_ai >= Score.DEAD_FOUR) {
						aideadfours.push(p)
					} else if (score_hum >= Score.DEAD_FOUR) {
						humdeadfours.push(p)
					} else if (score_ai >= 2 * Score.LIVING_THREE) {	//能成双三也行
						aitwo_threes.push(p)
					} else if (score_hum >= 2 * Score.LIVING_THREE) {
						humtwo_threes.push(p)
					} else if (score_ai >= Score.LIVING_THREE) {
						ailivingthrees.push(p)
					} else if (score_hum >= Score.LIVING_THREE) {
						humlivingthrees.push(p)
					} else if (score_ai >= Score.LIVING_TWO) {
						ailivingtwos.unshift(p)
					} else if (score_hum >= Score.LIVING_TWO) {
						humlivingtwos.unshift(p)
					} else neighbors.push(p)
				}
			}
		}

		// 如果成五，是必杀棋，直接返回
		if (fives.length) return fives

		// 如果自己能活四，则直接活四，不考虑冲四
		if (role === Role.ai && ailivingfours.length) return ailivingfours
		if (role === Role.hum && humlivingfours.length) return humlivingfours

		// 如果对面有活四，自己冲四都没，则只考虑对面活四
		if (role === Role.ai && humlivingfours.length && !aideadfours.length) return humlivingfours
		if (role === Role.hum && ailivingfours.length && !humdeadfours.length) return ailivingfours

		// 如果对面有活四自己有冲四，则都考虑下
		let fours = role === Role.ai ? ailivingfours.concat(humlivingfours) : humlivingfours.concat(ailivingfours)
		let deadfours = role === Role.ai ? aideadfours.concat(humdeadfours) : humdeadfours.concat(aideadfours)
		if (fours.length) return fours.concat(deadfours)

		let ret = []
		if (role === Role.ai) {
			ret = aitwo_threes
				  .concat(humtwo_threes)
				  .concat(aideadfours)
				  .concat(humdeadfours)
				  .concat(ailivingthrees)
				  .concat(humlivingthrees)
		}
		if (role === Role.hum) {
			ret = humtwo_threes
				  .concat(aitwo_threes)
				  .concat(humdeadfours)
				  .concat(aideadfours)
				  .concat(humlivingthrees)
				  .concat(ailivingthrees)
		}

		//如果有双三也直接返回
		if (aitwo_threes.length || humtwo_threes.length || ailivingthrees.length || humlivingthrees.length) {
			return ret
		}

		// 如果只返回大于等于活三的棋
		if (only_threes) {
			return ret
		}

		let twos
		if (role === Role.ai) twos = ailivingtwos.concat(humlivingtwos)
		else twos = humlivingtwos.concat(ailivingtwos)

		twos.sort(function (a, b) { return b.score - a.score })	//从大到小排序
		ret = ret.concat(twos.length ? twos : neighbors)

		//这种分数低的，就不用全部计算了
		if (ret.length > config.countLimit) {
			return ret.slice(0, config.countLimit)
		}

		return ret
	}

	/*
	 * 判断某个位置周围是否有足够的邻居
	 * @param row		该位置行数
	 * @param column		该位置列数
	 * @param dis	距离
	 * @param cnt	所需邻居数量
	 */
	hasNeighbour(row, column, dis, cnt) {
		let board = this.board
		for (let i = Math.max(0, row - dis); i <= row + dis; ++i) {
			if (i >= this.size) break
			for (let j = Math.max(0, column - dis); j <= column + dis; ++j) {
				if (j >= this.size) 
					break
				if (i == row && j == column) 
					continue
				if (board[i][j] != Role.empty) {
					--cnt
					if (cnt <= 0)
						return true
				}
			}
		}
		return false
	}
	toString () {
		return this.board.map(function (d) { return d.join(',') }).join('\n')
	}
}

let board = new Board()	//实例化一个board对象