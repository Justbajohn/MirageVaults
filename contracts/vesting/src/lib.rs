#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[contracttype]
enum DataKey {
    Admin,
    Token,
    Beneficiary,
    TotalAmount,
    ClaimedAmount,
    Start,
    Cliff,
    Duration,
    Initialized,
}

#[contract]
pub struct Vesting;

#[contractimpl]
impl Vesting {
    /// Initialize a vesting schedule
    /// - token: the token contract address
    /// - beneficiary: who receives the tokens
    /// - total_amount: total tokens to vest
    /// - cliff: seconds before any tokens unlock
    /// - duration: total vesting duration in seconds
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        beneficiary: Address,
        total_amount: i128,
        cliff: u64,
        duration: u64,
    ) {
        assert!(
            !env.storage().instance().has(&DataKey::Initialized),
            "already initialized"
        );
        assert!(total_amount > 0, "amount must be positive");
        assert!(duration > 0, "duration must be positive");
        assert!(cliff <= duration, "cliff must be <= duration");

        let start = env.ledger().timestamp();

        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Beneficiary, &beneficiary);
        env.storage().instance().set(&DataKey::TotalAmount, &total_amount);
        env.storage().instance().set(&DataKey::ClaimedAmount, &0i128);
        env.storage().instance().set(&DataKey::Start, &start);
        env.storage().instance().set(&DataKey::Cliff, &cliff);
        env.storage().instance().set(&DataKey::Duration, &duration);
    }

    /// How many tokens have vested so far (whether claimed or not)
    pub fn vested_amount(env: Env) -> i128 {
        let now = env.ledger().timestamp();
        let start: u64 = env.storage().instance().get(&DataKey::Start).unwrap();
        let cliff: u64 = env.storage().instance().get(&DataKey::Cliff).unwrap();
        let duration: u64 = env.storage().instance().get(&DataKey::Duration).unwrap();
        let total: i128 = env.storage().instance().get(&DataKey::TotalAmount).unwrap();

        let elapsed = now.saturating_sub(start);

        if elapsed < cliff {
            return 0;
        }

        if elapsed >= duration {
            return total;
        }

        // Linear vesting
        (total * elapsed as i128) / duration as i128
    }

    /// How many tokens are available to claim right now
    pub fn claimable_amount(env: Env) -> i128 {
        let vested = Self::vested_amount(env.clone());
        let claimed: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ClaimedAmount)
            .unwrap_or(0);
        vested.saturating_sub(claimed)
    }

    /// Beneficiary claims all currently available tokens
    pub fn claim(env: Env) {
        let beneficiary: Address = env
            .storage()
            .instance()
            .get(&DataKey::Beneficiary)
            .unwrap();
        beneficiary.require_auth();

        let claimable = Self::claimable_amount(env.clone());
        assert!(claimable > 0, "nothing to claim");

        let claimed: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ClaimedAmount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::ClaimedAmount, &(claimed + claimable));

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let client = soroban_sdk::token::Client::new(&env, &token);
        client.transfer(&env.current_contract_address(), &beneficiary, &claimable);
    }

    /// Admin deposits tokens into the vesting contract to fund the schedule
    pub fn deposit(env: Env, from: Address, amount: i128) {
        from.require_auth();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let client = soroban_sdk::token::Client::new(&env, &token);
        client.transfer(&from, &env.current_contract_address(), &amount);
    }

    // --- View helpers ---

    pub fn get_beneficiary(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Beneficiary).unwrap()
    }

    pub fn get_total_amount(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalAmount).unwrap_or(0)
    }

    pub fn get_claimed_amount(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::ClaimedAmount).unwrap_or(0)
    }

    pub fn get_start(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::Start).unwrap_or(0)
    }

    pub fn get_cliff(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::Cliff).unwrap_or(0)
    }

    pub fn get_duration(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::Duration).unwrap_or(0)
    }
}