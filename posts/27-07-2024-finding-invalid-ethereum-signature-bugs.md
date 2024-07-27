At **[0xPass](https://0xpass.io)**, we are building Passport Protocol, an MPC based, distributed key management network, built with secure enclaves (a mouthful, I know). In short we use secure enclaves and a network of nodes to essentially "shard" the key across the network of nodes, into key shares, stored in the enclaves (so they aren't accessible), and then use a distributed signing protocol to generate signatures with that private key, without exposing it. Now, this isn't an entirely accurate description, maybe we can cover that in another post, but for the purposes of this post, it covers the high level ideas.

What this post is about, is how I found a bug in the signature generation process of the MPC library we were using, which lead to finding a bug in foundry, and a little bit about ethereum's signature validation process.

## Ethereum Signature Validation Process

Ethereum signature validation involves several steps that ensure a message or transaction was signed by the owner of a specific Ethereum address. Here's a high-level overview of how it works:

- **Hashing:**
  The first step is to hash the message or transaction data using Keccak-256 this is usually also serialized beforehand in the case of a transaction, and for messages a prefix is attached and it's formatted in a specific way.

- **Signing the Hash:**
  Next, the hash gets signed with the private key linked to the Ethereum address, producing a signature with r, s, and v components.

- **Recovering the Public Key:**
  By using the r, s, and v values, the public key can be recovered through ECDSA signature verification.

- **Deriving the Ethereum Address:**
  The recovered public key undergoes Keccak-256 hashing. The last 20 bytes form the Ethereum address corresponding to the public key.

- **Verification:**
  Finally, the derived Ethereum address is compared to the claimed address. If they match, the signature is deemed valid.

## The Bug

So now that we have an understanding of how ethereum signatures work, let's look at how the bug we found came to be. We decided to make our nodes **[EIP-1193](https://eips.ethereum.org/EIPS/eip-1193)** compliant for signing purposes, this just means we run a JSON-RPC server that exposes `personal_sign`, `eth_signTransaction` and `eth_signTypedData` endpoints, and follows the EIP spec, so that is compatible with all the existing tooling to support signing transactions and messages.

We had our keygen and signing processes working as expected, and I was responsible for setting up the signing RPC endpoints. With the amazing ecosystem of rust-ethereum tooling e.g **[ethers-rs](https://github.com/gakonst/ethers-rs)** at the time, it didn't take too long to get the endpoints working, parsing requests & signing transactions and messages. Now it was time to test it out.

I had the Passport node running locally, then I setup an anvil node, to run a local chain, and then used postman to send a simple transaction request to the Passport node to be signed, once signed, I submitted the transaction to the local chain using **[this script](https://gist.github.com/k-xo/670520238fbb1c1b950b3bf10211f6be)** and, voila, it worked, straight out of the box, **perfect 🎉**

Now that we had it working locally, it was time to up the ante, and test it out on a testnet. The setup remained exactly the same, we just changed the endpoint we were submitting the signed transaction to, to point to a testnet network and similarly out of the gate, it worked. Surely it wouldn't hurt to try one more time, which I did, the exact same setup... and it didn't work 😱. What was wrong? Did I not have enough ETH to pay for the gas fees? Did I chose the wrong nonce? Did I choose a wrong chain id? I took a closer look and couldn't find what was wrong, everything seemed to be fine, so I tried again... and it worked.

This was strange, so I tested this out a few more times, and it would sporadically fail, with no changes from the times in which it was successful. There's nothing more frustrating than a bug that appears only sometimes. I went on a tirade testing the signatures on various tools. Some tools consistently recognized the signatures as valid, while others intermittently failed. However, none of the tools provided any clarity on why this was happening. I spoke to the library maintainers, and nothing seemed to be wrong, perhaps it was a bug in the rpc endpoint implementation, maybe the testnet endpoints I was using just weren't working properly, so many things were unclear, and at this point anything was on the cards. It wasn't until I came across **[this tool](https://rawtxdecode.in/)** which decoded the signed raw transaction, that I began to have some understanding of what might be going on.

Dreary-eyed and frustrated, I went to bed to take a look with clearer eyes the next day. The following morning even with the small inspiration at the end of the previous day, wasn't any better, after a walk, and some more time banging my head against the wall, I wasn't any closer to figuring out what the bug was. I decided to revist my assumptions, what if the signature was valid, from a cryptographic perspective, but it wasn't from an ethereum perspective? This led me to a deep rabbit hole on how ethereum signatures work, and how they are validated. One thing I didn't mention in the previous section, and what led to the solution, is the following:

Ethereum uses ECDSA signatures, which are based on the secp256k1 curve. In this signature scheme a signature consists of two values, r and s, and on the elliptic curve used for a given a r value , there are two possible s values that are valid. Specifically, if (r, s) is a valid signature, then (r, -s) is also a valid signature. Which basically means there are 2 valid signatures for any signed message / transaction.

Now obviously this can't work for blockchains as it allows for what is called "signature malleability", in short if there are 2 valid signatures for a given message, there could be scenario where if a transaction is signed and broadcasted, an attacker can modify the signature to create a new valid transaction. This new transaction can be replayed on the network, leading to unintended consequences or unauthorized transactions being executed. To get around this ethereum only accepts for one valid signature, where the value of s must be in the lower half of the curve's order. So when a signature is generated, it is "normalized" to ensure this.

## Resolution

So after 2 days of incessant debugging, and banging my head against the wall, we finally had a resolution. The issue was that the signature was valid, but it wasn't from an ethereum perspective, in the MPC library the signature was returned irregardless of which half of the curve's order the s value was in. So we just had to normalize the signature before returning it, and after 2 days we had a 5 line solution that looked somewhat like this.

```rust
let (sign, recovery_id) = if let Some(normalized_signature) = signature.normalize_s() {
  (normalized_signature, recover_id ^ 1)
} else {
  (signature, recover_id)
}
```

But wait, how come submitting the transaction on the local chain running anvil always worked successfully? Well I submitted an issue **[here](https://github.com/foundry-rs/foundry/issues/6072)**, and it turns out they had a similar issue where signatures weren't checked for normalization, so irregardless of the bound the s values existed in, it was still considered valid. The issue was resolved, and now invalid signatures are rejected. I was a bit early in my rust journey then, but I think I would've like to have taken the bias to action to actively contribute to fixing the issue myself, definitely something I'll be doing in the future.

## TL;DR

While setting up our signing RPC endpoints, I encountered a sporadic bug in the signature generation process of our MPC library. After extensive debugging, I discovered that the issue was due to signature malleability. Ethereum requires the s value in ECDSA signatures to be in the lower half of the curve's order to prevent multiple valid signatures for the same transaction. Our library was not normalizing the s value, causing some signatures to be invalid. When testing on a local chain with anvil, signatures were always valid, which underscored that anvil wasn't validating signatures correctly either, so we submitted an issue to the foundry repo, and it was resolved.
