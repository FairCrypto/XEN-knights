// SPDX-License-Identifier: MIT

const assert = require('assert')
const timeMachine = require('ganache-time-traveler');
const shuffle = require("../src/shuffle");
const {toBigInt} = require("../src/utils");
require('dotenv').config()

const XENCrypto = artifacts.require("XENCrypto")
const XENStake = artifacts.require("XENStake")
const XENKnights = artifacts.require("XENKnights")

const extraPrint = process.env.EXTRA_PRINT;
const { XK_DELAY = 10, XK_DURATION = 1} = process.env;
contract("XENKnights", async accounts => {

    this.timeout = 999_000_000;

    const ether = 10n ** 18n;
    let xenCrypto;
    let b0, b1, b9;
    let xenStake;
    let tokens0, tokens1;
    const stakeTerm = 1000;
    const zeroStakeTerm = 0;
    const lowStakeTerm = 1;
    const highStakeTerm = 1100;
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
            () => xenKnights.enterCompetition(1, taproot0, { value: 1 }),
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
        extraPrint && console.log('    #0', b0 / ether);
        extraPrint && console.log('    #9', b9 / ether);
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

    it("shall reject to enter XEN Knights competition without value > 0 attached", async () => {
        await assert.rejects(() => xenKnights.enterCompetition(tokens0[0], taproot0));
    })

    it("shall reject to enter XEN Knights competition with illegal tokenId", async () => {
        await assert.rejects(
            () => xenKnights.enterCompetition(283, taproot0, { value: 1 }),
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
            () => xenKnights.enterCompetition(tokens1[0], taproot0, { value: 1, from: accounts[1] }),
            'XenKnights: stake term incorrect'
        );
    })

    it("shall reject to enter XEN Knights competition with illegal taproot address", async () => {
        await assert.rejects(
            () => xenKnights.enterCompetition(tokens0[0], badTaproot1, { value: 1 }),
            'XenKnights: illegal taprootAddress length'
        );
        await assert.rejects(
            () => xenKnights.enterCompetition(tokens0[0], badTaproot2, { value: 1 }),
            'XenKnights: illegal taprootAddress length'
        );
        await assert.rejects(
            () => xenKnights.enterCompetition(tokens0[0], badTaproot3, { value: 1 }),
            'XenKnights: illegal taprootAddress signature'
        );
    })

    it("shall reject to enter XEN Knights competition with non-owned tokenId", async () => {
        await assert.rejects(
            () => xenKnights.enterCompetition(tokens1[0], taproot0, { value: 1 }),
            'XenKnights: not the tokenId owner'
        );
    })

    it("shall allow to enter XEN Knights competition with correct params", async () => {
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(tokens0[0], taproot0, { value: 1 })
        );
    })

    it("shall reject to enter XEN Knights competition with correct params for the second time", async () => {
        await assert.rejects(
            () => xenKnights.enterCompetition(tokens0[0], taproot0, { value: 1 }),
            'XenKnights: tokenId already in play'
        );
    })

    it("shall allow to enter XEN Knights competition with the same taproot address for the second time", async () => {
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(tokens0[1], taproot0, { value: 1 })
        );
    })

    it("shall allow to retrieve the leaderboard sorted in the right order (ascending by amount staked)", async () => {
        const board = await xenKnights.leaderboard(100).then(_ => _.map(__ => __.toNumber()));
        assert.ok(Array.isArray(board));
        assert.ok(board[0] = 2);
        assert.ok(board[1] = 1);
    })

    it("shall allow to stake XEN via XEN Stake XENFT interface (2)", async () => {
        //await assert.doesNotReject(() => xenCrypto.approve(xenStake.address, 1000, { from: accounts[1] }));
        await assert.doesNotReject(() => xenStake.createStake(200n * ether, stakeTerm, { from: accounts[1] }))
        await assert.doesNotReject(() => xenStake.createStake(200n * ether, stakeTerm, { from: accounts[1] }))
        tokens1 = await xenStake.ownedTokens({ from: accounts[1] }).then(_ => _.map(__ => __.toNumber()));
        assert.ok(Array.isArray(tokens1));
        assert.ok(tokens1.length === 3);
        assert.ok(tokens1[0] === 3);
        assert.ok(tokens1[1] === 4);
        assert.ok(tokens1[2] === 5);
    })

    it("shall allow to enter XEN Knights competition from different address", async () => {
        let nextIndex = await xenKnights.nextIndex(200n * ether).then(_ => _.toNumber());
        assert.ok(nextIndex === 1);
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(tokens1[1], taproot0, { value: 1, from: accounts[1] })
        );
        nextIndex = await xenKnights.nextIndex(200n * ether).then(_ => _.toNumber());
        assert.ok(nextIndex === 4);
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(tokens1[2], taproot0, { value: 1, from: accounts[1] })
        );
    })

    it("shall allow to retrieve the leaderboard sorted in the right order (ascending by amount staked)", async () => {
        const board = await xenKnights.leaderboard(100).then(_ => _.map(__ => __.toNumber()));
        assert.ok(Array.isArray(board));
        assert.ok(board.length === 4);
        assert.ok(board[0] = 5);
        assert.ok(board[1] = 4);
        assert.ok(board[2] = 2);
        assert.ok(board[3] = 1);
    })

    it("shall reject to enter XEN Knights competition after the end time", async () => {
        await timeMachine.advanceTime(1 * 24 * 3600 + 3600);
        await timeMachine.advanceBlock();
        await assert.rejects(
            () => xenKnights.enterCompetition(1, taproot0, { value: 1 }),
            'XenKnights: competition already finished'
        );
    })

})
