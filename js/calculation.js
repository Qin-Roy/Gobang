//Calculation类，用于根据计算得分判断大致棋局是否相等，
//因为要忽略一些较小分值的数带来的影响，因此设定阈值进行比较
class Calculation {
  equal(a, b) {
    b = b || 0.01
    return b >= 0 ? ((a >= b / threshold) && (a <= b * threshold))
      : ((a >= b * threshold) && (a <= b / threshold))
  }
  greaterThan(a, b) {
    return b >= 0 ? (a >= (b + 0.1) * threshold) : (a >= (b + 0.1) / threshold) // 注意处理b为0的情况，通过加一个0.1 做简单的处理
  }
  greaterThanOrEqual(a, b) {
    return this.equal(a, b) || this.greaterThan(a, b)
  }
  lessThan(a, b) {
    return b >= 0 ? (a <= (b - 0.1) / threshold) : (a <= (b - 0.1) * threshold)
  }
  lessThanOrEqual(a, b) {
    return this.equal(a, b) || this.lessThan(a, b)
  }
}

let calc = new Calculation() //实例化一个math对象