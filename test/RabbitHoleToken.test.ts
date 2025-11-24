import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { RabbitHoleToken } from "../types";

describe("RabbitHoleToken", function () {
  let token: RabbitHoleToken;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  const INITIAL_SUPPLY = ethers.parseUnits("100000", 6); // Give founder some initial plaintext tokens for testing
  const TRANSFER_AMOUNT = ethers.parseUnits("100", 6);

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    // Deploy contract
    const TokenFactory = await ethers.getContractFactory("RabbitHoleToken");
    token = (await TokenFactory.deploy(
      owner.address,
      INITIAL_SUPPLY,
      "RabbitHole Token",
      "RHT",
      "https://rabbithole.example/token",
    )) as RabbitHoleToken;
    await token.waitForDeployment();
  });

  describe("Initialization", function () {
    it("Should correctly set token information", async function () {
      expect(await token.name()).to.equal("RabbitHole Token");
      expect(await token.symbol()).to.equal("RHT");
      expect(await token.decimals()).to.equal(6);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("Initial balance should be correct", async function () {
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    });
  });

  describe("ERC20 Standard Functions", function () {
    it("Should be able to perform regular transfer", async function () {
      const transferAmount = ethers.parseUnits("100", 6);
      await token.transfer(alice.address, transferAmount);

      expect(await token.balanceOf(alice.address)).to.equal(transferAmount);
    });

    it("Should be able to approve and transfer", async function () {
      const approveAmount = ethers.parseUnits("500", 6);
      const transferAmount = ethers.parseUnits("300", 6);

      await token.approve(alice.address, approveAmount);
      expect(await token.allowance(owner.address, alice.address)).to.equal(approveAmount);

      await token.connect(alice).transferFrom(owner.address, bob.address, transferAmount);

      expect(await token.balanceOf(bob.address)).to.equal(transferAmount);
      expect(await token.allowance(owner.address, alice.address)).to.equal(approveAmount - transferAmount);
    });
  });

  describe("Plaintext to Confidential Conversion", function () {
    it("Should be able to convert plaintext balance to encrypted balance", async function () {
      const convertAmount = ethers.parseUnits("500", 6);

      // Balance before conversion
      const balanceBefore = await token.balanceOf(owner.address);

      // Execute conversion
      await expect(token.convertToConfidential(convertAmount))
        .to.emit(token, "ConvertedToConfidential")
        .withArgs(owner.address, convertAmount);

      // Plaintext balance decreases after conversion
      expect(await token.balanceOf(owner.address)).to.equal(balanceBefore - convertAmount);

      // Encrypted balance increases (cannot directly verify specific value, but can verify handle exists)
      const confidentialBalance = await token.confidentialBalanceOf(owner.address);
      expect(confidentialBalance).to.not.be.undefined;
    });

    it("Conversion should fail when balance is insufficient", async function () {
      const excessAmount = INITIAL_SUPPLY + ethers.parseUnits("1", 6);

      await expect(token.convertToConfidential(excessAmount)).to.be.reverted;
    });
  });

  describe("Encrypted Balance Operations", function () {
    beforeEach(async function () {
      // Mint some tokens first
      await token.mint();
    });

    it("Should be able to perform encrypted transfer", async function () {
      const transferAmount = 100n;

      // Create encrypted input
      const encryptedInput = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(transferAmount)
        .encrypt();

      // Execute encrypted transfer
      await expect(
        token["confidentialTransfer(address,bytes32,bytes)"](
          alice.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof,
        ),
      ).to.emit(token, "ConfidentialTransfer");

      // Verify alice has encrypted balance
      const aliceBalance = await token.confidentialBalanceOf(alice.address);
      expect(aliceBalance).to.not.be.undefined;
    });
  });

  describe("Minting and Burning", function () {
    it("Anyone should be able to mint confidential tokens", async function () {
      // Alice calls mint()
      await token.connect(alice).mint();

      // Alice's plaintext balance remains 0
      expect(await token.balanceOf(alice.address)).to.equal(0);

      // Alice has encrypted balance
      const aliceBalance = await token.confidentialBalanceOf(alice.address);
      expect(aliceBalance).to.not.be.undefined;

      // Total supply increases by 10000 * 10^6
      const mintAmount = 10000n * 10n ** 6n;
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
    });

    it("Anyone should be able to mint confidential tokens to a specific address", async function () {
      // Bob calls mintTo to mint tokens for Alice (verifies anyone can call)
      await token.connect(bob).mintTo(alice.address);

      // Alice's plaintext balance remains 0
      expect(await token.balanceOf(alice.address)).to.equal(0);

      // Alice has encrypted balance
      const aliceBalance = await token.confidentialBalanceOf(alice.address);
      expect(aliceBalance).to.not.be.undefined;

      // Total supply increases by 10000 * 10^6
      const mintAmount = 10000n * 10n ** 6n;
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
    });

    it("Should be able to burn plaintext tokens", async function () {
      const burnAmount = ethers.parseUnits("100", 6);
      const balanceBefore = await token.balanceOf(owner.address);
      const totalSupplyBefore = await token.totalSupply();

      await token.burn(burnAmount);

      expect(await token.balanceOf(owner.address)).to.equal(balanceBefore - burnAmount);
      expect(await token.totalSupply()).to.equal(totalSupplyBefore - burnAmount);
    });
  });

  describe("Access Control", function () {
    it("Should be able to transfer ownership", async function () {
      // Step 1: Propose new owner
      await token.transferOwnership(alice.address);

      // Step 2: New owner accepts
      await token.connect(alice).acceptOwnership();

      expect(await token.owner()).to.equal(alice.address);
    });
  });
});
