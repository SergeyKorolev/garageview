module ParallelMap
  POOL_SIZE = 5

  private

  # Runs the block for each item on a bounded thread pool and returns the
  # results in order. Each task checks out its own AR connection. The first
  # task error is re-raised (Thread#value semantics), so failures propagate
  # to the caller/Sidekiq instead of silently resolving to nil.
  def parallel_map(items)
    pool = Concurrent::FixedThreadPool.new(POOL_SIZE)
    begin
      futures = items.map do |item|
        Concurrent::Promises.future_on(pool, item) do |i|
          ActiveRecord::Base.connection_pool.with_connection { yield(i) }
        end
      end
      futures.map(&:value!)
    ensure
      pool.shutdown
      pool.wait_for_termination
    end
  end
end
