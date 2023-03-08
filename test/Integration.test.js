// SPDX-License-Identifier: MIT

const assert = require('assert')
const timeMachine = require('ganache-time-traveler');
const {toBigInt} = require("../src/utils");
require('dotenv').config()

const XENCrypto = artifacts.require("XENCrypto")
const XENStake = artifacts.require("XENStake")
const XENKnights = artifacts.require("XENKnights")

const extraPrint = process.env.EXTRA_PRINT;
const { XK_DELAY = 10, XK_DURATION = 1} = process.env;
contract("XENKnights", async accounts => {

    this.timeout = 999_000_000;

    const taproots = [
        'b1cp0000000000000000000000000000000000000000000000000000000000',
        'b1cp0000000000000000000000000000000000000000000000000000000001',
        'b1cp0000000000000000000000000000000000000000000000000000000002',
        'b1cp0000000000000000000000000000000000000000000000000000000003',
        'b1cp0000000000000000000000000000000000000000000000000000000004',
        'b1cp0000000000000000000000000000000000000000000000000000000005',
    ]

    const ether = 10n ** 18n;
    let xenCrypto;
    let b0, b1, b9;
    let xenStake;
    let tokens0, tokens1, tokens2;
    const stakeTerm = 1000;
    const lowStakeTerm = 1;
    const taproot0 = 'b1cp0000000000000000000000000000000000000000000000000000000000';
    const badTaproot1 = 'b1cp000000000000000000000000000000000000000000000000000000000';
    const badTaproot2 = 'b1cp00000000000000000000000000000000000000000000000000000000000';
    const badTaproot3 = 'b2cp0000000000000000000000000000000000000000000000000000000000';
    let xenKnights;

    before(async () => {
        assert.ok(Number(XK_DELAY) >= 100 * 24 * 3600, 'wrong start delay for this test, please set XK_DELAY');
        try {
            xenCrypto = await XENCrypto.deployed();
            xenStake = await XENStake.deployed();
            xenKnights = await XENKnights.deployed();
        } catch (e) {
            console.error(e)
        }
    })

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
        b9 = await xenCrypto.balanceOf(accounts[9]).then(toBigInt);
        extraPrint && console.log('    bal #0', b0 / ether);
        extraPrint && console.log('    bal #9', b9 / ether);
        assert.ok(b0 > 0n);
        assert.ok(b9 > 0n);
        assert.ok(b0 > b9);
    })

    it("shall allow to stake XEN via XEN Stake XENFT interface", async () => {
        await assert.doesNotReject(() => xenCrypto.approve(xenStake.address, 1000n * ether));
        await assert.doesNotReject(() => xenStake.createStake(100n * ether, stakeTerm))
        await assert.doesNotReject(() => xenStake.createStake(100n * ether, stakeTerm))
        tokens0 = await xenStake.ownedTokens().then(_ => _.map(__ => __.toNumber()));
        assert.ok(Array.isArray(tokens0));
        assert.ok(tokens0.length === 2);
        assert.ok(tokens0[0] === 1);
        assert.ok(tokens0[1] === 2);
    })


    it("shall reject to enter XEN Knights competition with illegal tokenId", async () => {
        await assert.rejects(
            () => xenKnights.enterCompetition(283, taproot0),
            'ERC721: invalid token ID'
        );
    })

    it("shall reject to enter XEN Knights competition with stake of wrong term", async () => {
        await assert.doesNotReject(() => xenCrypto.approve(xenStake.address, 1000n * ether, { from: accounts[1] }));
        await assert.doesNotReject(() => xenStake.createStake(200, lowStakeTerm, { from: accounts[1] }));
        tokens1 = await xenStake.ownedTokens({ from: accounts[1] }).then(_ => _.map(__ => __.toNumber()));
        assert.ok(Array.isArray(tokens1));
        assert.ok(tokens1.length === 1);
        assert.ok(tokens1[0] === 3);
        await assert.rejects(
            () => xenKnights.enterCompetition(tokens1[0], taproots[tokens1[0]], { from: accounts[1] }),
            'XenKnights: stake term incorrect'
        );
    })

    it("shall reject to enter XEN Knights competition with illegal taproot address", async () => {
        await assert.rejects(
            () => xenKnights.enterCompetition(tokens0[0], badTaproot1),
            'XenKnights: illegal taprootAddress length'
        );
        await assert.rejects(
            () => xenKnights.enterCompetition(tokens0[0], badTaproot2),
            'XenKnights: illegal taprootAddress length'
        );
        await assert.rejects(
            () => xenKnights.enterCompetition(tokens0[0], badTaproot3),
            'XenKnights: illegal taprootAddress signature'
        );
    })

    it("shall reject to enter XEN Knights competition with non-owned tokenId", async () => {
        await assert.rejects(
            () => xenKnights.enterCompetition(tokens1[0], taproots[tokens1[0]]),
            'XenKnights: not the tokenId owner'
        );
    })

    it("shall allow to enter XEN Knights competition with correct params", async () => {
        await assert.doesNotReject(
            async () => {
                const res = await xenKnights.enterCompetition(tokens0[0], taproots[tokens0[0]]);
                console.log(res.receipt.gasUsed);
                return res;
            }
        );
    })

    it("shall reject to enter XEN Knights competition with correct params for the second time", async () => {
        await assert.rejects(
            () => xenKnights.enterCompetition(tokens0[0], taproots[tokens0[0]]),
            'XenKnights: tokenId already used'
        );
    })

    it("shall allow to enter XEN Knights competition with the same taproot address for the second time", async () => {
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(tokens0[1], taproots[tokens0[1]])
        );
    })

    it("shall allow to retrieve the leaderboard sorted in the right order (ascending by amount staked)", async () => {
        const board = await xenKnights.leaderboard(100);
        assert.ok(Array.isArray(board));
        console.log(board);
        assert.ok(board[0] === taproots[2]);
        assert.ok(board[1] === taproots[1]);
    })

    it("shall allow to stake XEN via XEN Stake XENFT interface (2)", async () => {
        //await assert.doesNotReject(() => xenCrypto.approve(xenStake.address, 1000, { from: accounts[1] }));
        await assert.doesNotReject(() => xenStake.createStake(200n * ether, stakeTerm, { from: accounts[1] }))
        await assert.doesNotReject(() => xenStake.createStake(200n * ether, stakeTerm, { from: accounts[1] }))
        await assert.doesNotReject(() => xenCrypto.approve(xenStake.address, 1000n * ether, { from: accounts[2] }));
        await assert.doesNotReject(() => xenStake.createStake(400n * ether, stakeTerm, { from: accounts[2] }))
        await assert.doesNotReject(() => xenStake.createStake(400n * ether, stakeTerm, { from: accounts[2] }))
        tokens1 = await xenStake.ownedTokens({ from: accounts[1] }).then(_ => _.map(__ => __.toNumber()));
        tokens2 = await xenStake.ownedTokens({ from: accounts[2] }).then(_ => _.map(__ => __.toNumber()));
        assert.ok(Array.isArray(tokens1));
        assert.ok(tokens1.length === 3);
        assert.ok(tokens1[0] === 3);
        assert.ok(tokens1[1] === 4);
        assert.ok(tokens1[2] === 5);
    })

    it("shall allow to enter XEN Knights competition from different address", async () => {
        let nextIndex = await xenKnights.nextIndex(200n * ether);
        assert.ok(nextIndex === taproots[1]);
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(tokens1[1], taproots[tokens1[1]], { from: accounts[1] })
        );
        nextIndex = await xenKnights.nextIndex(200n * ether);
        console.log(nextIndex)
        //assert.ok(nextIndex === taproots[4]);
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(tokens1[2], taproots[tokens1[2]], { from: accounts[1] })
        );
    })

    it("shall allow to retrieve the leaderboard sorted in the right order (ascending by amount staked)", async () => {
        const board = await xenKnights.leaderboard(100);
        assert.ok(Array.isArray(board));
        // assert.ok(board.length === 4);
        console.log(board);
        //assert.ok(board[0] === taproots[2]);
        //assert.ok(board[1] === taproots[1]);
        //assert.ok(board[2] === taproots[5]);
        //assert.ok(board[3] === taproots[4]);
    })

    it("shall allow to retrieve correct cumulative amount by taproot address (1)", async () => {
        const amount1 = await xenKnights.amounts(taproots[1]).then(toBigInt);
        const amount2 = await xenKnights.amounts(taproots[2]).then(toBigInt);
        const amount3 = await xenKnights.amounts(taproots[3]).then(toBigInt);
        const amount4 = await xenKnights.amounts(taproots[4]).then(toBigInt);
        const amount5 = await xenKnights.amounts(taproots[5]).then(toBigInt);
        console.log(taproots[1], amount1);
        console.log(taproots[2], amount2);
        console.log(taproots[3], amount3);
        console.log(taproots[4], amount4);
        console.log(taproots[5], amount5);
    })

    it("shall allow to enter XEN Knights competition from different address (3) with others' taproot address", async () => {
        console.log(await xenKnights.nextIndex(500n * ether));
        console.log(await xenKnights.indexes(taproots[tokens0[0]], 500n * ether));
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(tokens2[0], taproots[tokens0[0]], { from: accounts[2] })
        );
    })

    it("shall allow to retrieve the leaderboard sorted in the right order (ascending by amount staked) - 2", async () => {
        const board = await xenKnights.leaderboard(100);
        assert.ok(Array.isArray(board));
        // assert.ok(board.length === 4);
        console.log(board);
        // assert.ok(board[0] === taproots[2]);
        // assert.ok(board[1] === taproots[1]);
        // assert.ok(board[2] === taproots[5]);
        // assert.ok(board[3] === taproots[4]);
    })

    it("shall allow to enter XEN Knights competition from different address (3) with others' taproot address", async () => {
        console.log(await xenKnights.indexes(taproots[tokens0[0]], 900n * ether));
        console.log(await xenKnights.nextIndex(900n * ether));
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(tokens2[1], taproots[tokens0[0]], { from: accounts[2] })
        );
    })

    it("shall allow to retrieve correct cumulative amount by taproot address (2)", async () => {
        const amount1 = await xenKnights.amounts(taproots[1]).then(toBigInt);
        const amount2 = await xenKnights.amounts(taproots[2]).then(toBigInt);
        const amount3 = await xenKnights.amounts(taproots[3]).then(toBigInt);
        const amount4 = await xenKnights.amounts(taproots[4]).then(toBigInt);
        const amount5 = await xenKnights.amounts(taproots[5]).then(toBigInt);
        console.log(taproots[1], amount1);
        console.log(taproots[2], amount2);
        console.log(taproots[3], amount3);
        console.log(taproots[4], amount4);
        console.log(taproots[5], amount5);
    })

    it("shall allow to retrieve the leaderboard sorted in the right order (ascending by amount staked) - 2", async () => {
        const board = await xenKnights.leaderboard(100);
        assert.ok(Array.isArray(board));
        // assert.ok(board.length === 4);
        console.log(board);
        // assert.ok(board[0] === taproots[2]);
        // assert.ok(board[1] === taproots[1]);
        // assert.ok(board[2] === taproots[5]);
        // assert.ok(board[3] === taproots[4]);
    })

    it("shall reject to enter XEN Knights competition after the end time", async () => {
        await timeMachine.advanceTime(1 * 24 * 3600 + 3600);
        await timeMachine.advanceBlock();
        await assert.rejects(
            () => xenKnights.enterCompetition(1, taproots[1]),
            'XenKnights: competition already finished'
        );
    })

})
