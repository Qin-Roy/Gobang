var random = new Random(Random.engines.mt19937().autoSeed());
class Zobrist {
    init(size) {
        this.size = size || 15
        this.ai = [];
        this.hum = [];
        for(let i = 0;i < this.size * this.size;i++) {
            this.ai.push(this._rand());
            this.hum.push(this._rand());
        }
        this.code = this._rand();
    }

    _rand() {
        return random.integer(1, 1000000000)
    }

    go(x,y,role) {
        let index = this.size * x + y;
        this.code ^= (role == Role.ai ? this.ai[index] : this.hum[index]);
        return this.code;
    }
}
let zobrist = new Zobrist();
zobrist.init(15);
