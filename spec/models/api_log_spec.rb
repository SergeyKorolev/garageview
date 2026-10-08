require "rails_helper"

RSpec.describe ApiLog, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:user).optional }
  end

  describe "scopes" do
    describe ".recent" do
      it "orders logs by created_at descending" do
        old_log = create(:api_log, created_at: 2.days.ago)
        new_log = create(:api_log, created_at: 1.minute.ago)

        expect(ApiLog.recent.first).to eq(new_log)
      end
    end

    describe ".errors" do
      it "returns only error logs" do
        success_log = create(:api_log, status: "success")
        error_log = create(:api_log, status: "error")

        expect(ApiLog.errors).to contain_exactly(error_log)
      end
    end

    describe ".slow" do
      it "returns only logs with duration over 10 seconds" do
        fast_log = create(:api_log, duration_seconds: 2.5)
        slow_log = create(:api_log, duration_seconds: 15.0)

        expect(ApiLog.slow).to contain_exactly(slow_log)
      end
    end
  end

  describe ".log_call" do
    it "logs a successful API call and returns the result" do
      user = create(:user)
      result = ApiLog.log_call(service: "test_service", model: "gpt-4o", user: user) do
        { "usage" => { "prompt_tokens" => 10, "completion_tokens" => 20, "total_tokens" => 30 } }
      end

      expect(result).to be_a(Hash)
      log = ApiLog.last
      expect(log.service).to eq("test_service")
      expect(log.model).to eq("gpt-4o")
      expect(log.status).to eq("success")
      expect(log.prompt_tokens).to eq(10)
      expect(log.completion_tokens).to eq(20)
      expect(log.total_tokens).to eq(30)
      expect(log.duration_seconds).to be >= 0
    end

    it "logs a failed API call and re-raises the error" do
      expect {
        ApiLog.log_call(service: "test_service") do
          raise StandardError, "API timeout"
        end
      }.to raise_error(StandardError, "API timeout")

      log = ApiLog.last
      expect(log.status).to eq("error")
      expect(log.error_message).to eq("API timeout")
    end

    it "records the record_type and record_id when a record is provided" do
      collection = create(:collection)
      ApiLog.log_call(service: "test", record: collection) { "ok" }

      log = ApiLog.last
      expect(log.record_type).to eq("Collection")
      expect(log.record_id).to eq(collection.id)
    end

    it "stores request_payload as JSON" do
      ApiLog.log_call(service: "test", request_payload: { foo: "bar" }) { "ok" }
      log = ApiLog.last
      expect(log.request_payload).to include("foo")
    end
  end
end
