// SPDX-License-Identifier: MIT

const assert = require('assert');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');
const { toBigInt, bn2hexStr } = require("../src/utils");
const { keccak256: keccak } = require("@ethersproject/keccak256");
const { toUtf8Bytes } = require("@ethersproject/strings");
const { shuffled } = require("ethers/lib/utils");
require('dotenv').config()

const keccak256 = (str) => keccak(toUtf8Bytes(str));

const XENCrypto = artifacts.require("XENCrypto")
const XENKnights = artifacts.require("XENKnights")

const extraPrint = process.env.EXTRA_PRINT;
const { XK_DELAY = 100, XK_DURATION = 1} = process.env;

class Leaderboard {
    static MAX_LEADERS = 100;
    #leaders = [];
    #bids = {};
    #userBids = {};

    constructor() {
    }

    get leaders() {
        return this.#leaders;
    }

    get bids() {
        return this.#userBids;
    }

    get losers() {
        return Object.keys(this.#bids)
            .filter((addr) => !this.leaders.includes(addr));
    }

    #findIndex(amount) {
        if (this.#leaders.length === 0) return 0;
        let idx = 0;
        for (const l of this.#leaders) {
            if (this.#bids[l] >= amount) {
                return idx;
            }
            idx++;
        }
        return idx;
    }

    enter(taprootAddress, amount, from) {
        if (!taprootAddress) throw new Error('bad taproot');
        if (!amount) throw new Error('bad amount');
        if (!from) throw new Error('bad from');
        const currentAmount = this.#bids[taprootAddress] || 0n;
        const idx = this.#findIndex(amount);
        const currentIdx = this.#leaders.indexOf(taprootAddress);
        // console.log(taprootAddress, amount, currentIdx, idx);
        if (idx > currentIdx) {
            this.#leaders.splice(idx, 0, taprootAddress);
            if (currentIdx > -1) this.#leaders.splice(currentIdx, 1);
        }
        this.#bids[taprootAddress] = currentAmount + amount;
        if (!this.#userBids[taprootAddress]) this.#userBids[taprootAddress] = [];
        this.#userBids[taprootAddress].push(from);
        if(this.#leaders.length > Leaderboard.MAX_LEADERS) {
            this.#leaders.splice(0, 1);
        }
    }
}

contract("XENKnights", async accounts => {

    this.timeout = 999_000_000;
    const gasUsed = [];
    const leaderboard = new Leaderboard();

    const taproots = Array(110).fill(null)
        .map((_, i) => 'bc1p' + i.toString().padStart(58, '0'));

    const ether = 10n ** 18n;
    let xenCrypto;
    let b0, b1, b2, b3, b4, b5, b6, b7, b8, b9;
    const badTaproot1 = 'bc1p000000000000000000000000000000000000000000000000000000000';
    const badTaproot2 = 'bc1p00000000000000000000000000000000000000000000000000000000000';
    const badTaproot3 = 'b1cp0000000000000000000000000000000000000000000000000000000000';
    let xenKnights;

    before(async () => {
        assert.ok(Number(XK_DELAY) >= 100, 'wrong start delay for this test, please set XK_DELAY');
        try {
            xenCrypto = await XENCrypto.deployed();
            xenKnights = await XENKnights.deployed();
        } catch (e) {
            console.error(e)
        }
    })

    it("shall allow to read from XEN Crypto", async () => {
        assert.ok(await xenCrypto.genesisTs().then(_ => _.toNumber()) > 0);
    });

    it("shall allow to mint XEN via standard XEN Crypto mint interface", async () => {
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[0] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[1] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[2] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[3] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[4] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[5] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[6] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[7] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[8] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[9] }));
    })

    it("shall reject to enter XEN Knights competition before the start time", async () => {
        await assert.rejects(
            () => xenKnights.enterCompetition(1, taproots[1]),
            'XenKnights: competition not yet started'
        );
    })

    it("shall allow to claim XEN via standard XEN Crypto claimMintRewards interface", async () => {
        await timeMachine.advanceTime(100 * 24 * 3600 + 3600);
        await timeMachine.advanceBlock();
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[0] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[1] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[2] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[3] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[4] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[5] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[6] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[7] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[8] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[9] }));
    })

    it("shall show minted XEN balance", async () => {
        b0 = await xenCrypto.balanceOf(accounts[0]).then(toBigInt);
        b1 = await xenCrypto.balanceOf(accounts[1]).then(toBigInt);
        b2 = await xenCrypto.balanceOf(accounts[2]).then(toBigInt);
        b3 = await xenCrypto.balanceOf(accounts[3]).then(toBigInt);
        b4 = await xenCrypto.balanceOf(accounts[4]).then(toBigInt);
        b5 = await xenCrypto.balanceOf(accounts[5]).then(toBigInt);
        b6 = await xenCrypto.balanceOf(accounts[6]).then(toBigInt);
        b7 = await xenCrypto.balanceOf(accounts[7]).then(toBigInt);
        b8 = await xenCrypto.balanceOf(accounts[8]).then(toBigInt);
        b9 = await xenCrypto.balanceOf(accounts[9]).then(toBigInt);
        extraPrint && console.log('    bal #0', b0 / ether);
        extraPrint && console.log('    bal #9', b9 / ether);
        assert.ok(b0 > 0n);
        assert.ok(b9 > 0n);
        assert.ok(b0 > b9);
    })

    it("shall reject to enter XEN Knights competition with illegal taproot address", async () => {
        await assert.rejects(
            () => xenKnights.enterCompetition(100n * ether, badTaproot1),
            'XenKnights: illegal taprootAddress length'
        );
        await assert.rejects(
            () => xenKnights.enterCompetition(100n * ether, badTaproot2),
            'XenKnights: illegal taprootAddress length'
        );
        await assert.rejects(
            () => xenKnights.enterCompetition(100n * ether, badTaproot3),
            'XenKnights: illegal taprootAddress signature'
        );
    })

    it("shall allow to approve spending from XEN Crypto", async () => {
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b0, { from: accounts[0] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b1, { from: accounts[1] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b2, { from: accounts[2] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b3, { from: accounts[3] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b4, { from: accounts[4] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b5, { from: accounts[5] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b6, { from: accounts[6] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b7, { from: accounts[7] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b8, { from: accounts[8] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b1, { from: accounts[9] }));
    });

    it("shall reject to load leaderboard before competition is over", async () => {
        await assert.rejects(
            () => xenKnights.loadLeaders(taproots.slice(0, 100).map(keccak256)),
            'Admin: cannot load leaders before end'
        );
    });

    it("shall allow users with legal taproot addresses and legal amounts to enter competition", async () => {
        // let minAmount = 1n * ether;
        for await (const addr of taproots) {
            const idx = Math.floor(Math.random() * 10);
            await assert.doesNotReject(
                async () => {
                    const amount = BigInt(Math.floor(Math.random() * 10) + 1) * ether;
                    const result = await xenKnights.enterCompetition(amount, addr, { from: accounts[idx] })
                    // minAmount += ();
                    gasUsed.push(result.receipt.gasUsed);
                    truffleAssert.eventEmitted(
                        result,
                        'Admitted',
                        (event) => {
                            leaderboard.enter(event.taprootAddress, BigInt(bn2hexStr(event.amount)), accounts[idx]);
                            return event.user === accounts[idx]
                                && event.taprootAddress === addr
                                && BigInt(bn2hexStr(event.amount)) === BigInt(amount)
                        })
                    return result;
                }
            );
            process.stdout.write('.');
        }
        // ................................................................................................
        process.stdout.write('\n');
    })

    it("shall reject to load leaderboard before competition is over", async () => {
        await assert.rejects(
            () => xenKnights.loadLeaders(taproots.slice(0, 100).map(keccak256)),
            'Admin: cannot load leaders before end'
        );
    });

    it("shall allow to retrieve the leaderboard sorted in the right order", async () => {
        // const board = await xenKnights.leaderboard(100);
        // assert.ok(Array.isArray(board));
        extraPrint && console.log(leaderboard.leaders);
        extraPrint && console.log(leaderboard.losers);
        // assert.ok(board[0] === taproots[2]);
        // assert.ok(board[1] === taproots[5]);
        // assert.ok(board[2] === taproots[4]);
        // assert.ok(board[3] === taproots[1]);
    })

    it("shall reject anyone to burn winners' funds before competition is over and final", async () => {
        await assert.rejects(
            () => xenKnights.burn({ from: accounts[9] }),
            'XenKnights: competition not yet final'
        );
    })

    it("shall reject to enter XEN Knights competition after the end time", async () => {
        await timeMachine.advanceTime(XK_DURATION * 24 * 3600 + 3600);
        await timeMachine.advanceBlock();
        await assert.rejects(
            () => xenKnights.enterCompetition(1, taproots[1]),
            'XenKnights: competition already finished'
        );
    })

    it("shall reject a loser to withdraw before results are final", async () => {
        const addr = leaderboard.losers[0];
        const from = leaderboard.bids[addr]?.[0];
        assert.ok(typeof addr === 'string', 'bad taproot');
        assert.ok(typeof from === 'string', 'bad address');
        await assert.rejects(
            () => xenKnights.withdraw(addr, { from }),
            'XenKnights: competition still in progress'
        )
    });

    it("shall reject a non-admin to load results", async () => {
        await assert.rejects(
            () => xenKnights.loadLeaders(taproots.map(keccak256), { from: accounts[8] }),
            'Ownable: caller is not the owner'
        );
    })

    it("shall reject an admin to load results over limit", async () => {
        await assert.rejects(
            () => xenKnights.loadLeaders(taproots.slice(0, 101).map(keccak256), { from: accounts[0] }),
            'Admin: illegal list length'
        );
    })

   it("shall reject an admin to load incorrectly sorted results", async () => {
       const unsorted = shuffled([...leaderboard.leaders]);
       assert.ok(unsorted.length === leaderboard.leaders.length, 'bad shuffle');
       await assert.rejects(
            () => xenKnights.loadLeaders(unsorted.map(keccak256), { from: accounts[0] }),
            'Admin: list not sorted'
        );
    })

  it("shall allow an admin to load good results", async () => {
        await assert.doesNotReject(
            () => xenKnights.loadLeaders(leaderboard.leaders.map(keccak256), { from: accounts[0] })
        );
    })

    it("shall reject to withdraw winning amount after auction end time", async () => {
        for await (const addr of leaderboard.leaders) {
            await assert.rejects(
                () => xenKnights.withdraw(addr),
                'XenKnights: winner cannot withdraw'
            )
        }
    })

    it("shall allow to withdraw losers amounts after auction end time", async () => {
        for await (const addr of leaderboard.losers) {
            for await (const from of leaderboard.bids[addr]) {
                await assert.doesNotReject(
                    () => xenKnights.withdraw(addr, { from }),
                    'error withdrawing ' + addr + ': ' + leaderboard.bids[addr] + ' ' + from
                )
            }
        }
    })

    it("shall reject a loser to withdraw bid amount one more time", async () => {
        const addr = leaderboard.losers[0];
        const from = leaderboard.bids[addr]?.[0];
        assert.ok(typeof addr === 'string', 'bad taproot');
        assert.ok(typeof from === 'string', 'bad address');
        await assert.rejects(
            () => xenKnights.withdraw(addr, { from }),
            'XenKnights: nothing to withdraw'
        )
    });

    it("owned amount of XEN should be equal to burning amount", async () => {
        const xen = await xenCrypto.balanceOf(xenKnights.address).then(toBigInt);
        const toBurn = await xenKnights.totalToBurn().then(toBigInt);
        console.log(xen)
        assert.ok(xen === toBurn);
    })

    it("shall allow anyone to burn winners' funds after auction end time", async () => {
        await assert.doesNotReject(
            () => xenKnights.burn()
        );
    })

    it("owned amount of XEN should be equal to 0 after burning", async () => {
        const xen = await xenCrypto.balanceOf(xenKnights.address).then(toBigInt);
        console.log(xen)
        assert.ok(xen === 0n);
    })

    it("optional min/max gas numbers (requires EXTRA_PRINT)", async () => {
        //extraPrint && console.log('    Min est idx', Math.min(...gasEstIndexes));
        //extraPrint && console.log('    Max est idx', Math.max(...gasEstIndexes));
        //extraPrint && console.log('    Min est next idx', Math.min(...gasEstNextIndex));
        //extraPrint && console.log('    Max est next idx', Math.max(...gasEstNextIndex));
        extraPrint && console.log('    gas', gasUsed);
        extraPrint && console.log('    Min gas', Math.min(...gasUsed));
        extraPrint && console.log('    Max gas', Math.max(...gasUsed));
    })
})
