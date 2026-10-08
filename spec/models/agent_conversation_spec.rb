require "rails_helper"

RSpec.describe AgentConversation, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:user) }
  end

  describe "validations" do
    it { is_expected.to validate_inclusion_of(:conversation_type).in_array(AgentConversation::TYPES) }
  end

  describe "scopes" do
    describe ".recent" do
      it "orders conversations by updated_at descending" do
        user = create(:user)
        old = create(:agent_conversation, user: user, updated_at: 2.days.ago)
        recent = create(:agent_conversation, user: user, updated_at: 1.hour.ago)

        expect(AgentConversation.recent.first).to eq(recent)
        expect(AgentConversation.recent.last).to eq(old)
      end
    end

    describe ".by_type" do
      it "filters by conversation type when present" do
        user = create(:user)
        general = create(:agent_conversation, user: user, conversation_type: "general")
        research = create(:agent_conversation, user: user, conversation_type: "research")

        expect(AgentConversation.by_type("research")).to contain_exactly(research)
      end

      it "returns all conversations when type is blank" do
        user = create(:user)
        c1 = create(:agent_conversation, user: user, conversation_type: "general")
        c2 = create(:agent_conversation, user: user, conversation_type: "research")

        expect(AgentConversation.by_type(nil)).to include(c1, c2)
      end
    end
  end

  describe "#add_message" do
    it "appends a message and saves" do
      conversation = create(:agent_conversation, messages: [])
      conversation.add_message({ role: "user", content: "hello" })
      expect(conversation.reload.messages.size).to eq(1)
      expect(conversation.messages.first["role"]).to eq("user")
    end
  end

  describe "#add_messages" do
    it "appends multiple messages at once" do
      conversation = create(:agent_conversation, messages: [ { "role" => "user", "content" => "first" } ])
      conversation.add_messages([
        { role: "assistant", content: "second" },
        { role: "user", content: "third" }
      ])
      expect(conversation.reload.messages.size).to eq(3)
    end
  end

  describe "#last_n_messages" do
    it "returns the last N messages" do
      msgs = 5.times.map { |i| { "role" => "user", "content" => "msg #{i}" } }
      conversation = create(:agent_conversation, messages: msgs)
      expect(conversation.last_n_messages(2).size).to eq(2)
      expect(conversation.last_n_messages(2).last["content"]).to eq("msg 4")
    end

    it "returns all messages when fewer than N exist" do
      conversation = create(:agent_conversation, messages: [ { "role" => "user", "content" => "only" } ])
      expect(conversation.last_n_messages(20).size).to eq(1)
    end
  end

  describe "#auto_title_from_actions" do
    it "sets a title from the first matching action" do
      conversation = create(:agent_conversation, title: nil)
      actions = [ { type: "collection_created", name: "BMW X3" } ]
      conversation.auto_title_from_actions(actions)
      expect(conversation.reload.title).to eq("Created BMW X3")
    end

    it "does not overwrite an existing title" do
      conversation = create(:agent_conversation, title: "Existing Title")
      actions = [ { type: "collection_created", name: "New" } ]
      conversation.auto_title_from_actions(actions)
      expect(conversation.reload.title).to eq("Existing Title")
    end

    it "handles cars_added action type" do
      conversation = create(:agent_conversation, title: nil)
      actions = [ { type: "cars_added", cars_added: 5, collection_name: "SUVs" } ]
      conversation.auto_title_from_actions(actions)
      expect(conversation.reload.title).to eq("Added 5 cars to SUVs")
    end
  end

  describe "#auto_type_from_tools" do
    it "classifies as 'collection' when create_collection tool is used" do
      conversation = create(:agent_conversation, conversation_type: "general")
      conversation.auto_type_from_tools([ "create_collection" ])
      expect(conversation.reload.conversation_type).to eq("collection")
    end

    it "classifies as 'cars' when add_cars_to_collection tool is used" do
      conversation = create(:agent_conversation, conversation_type: "general")
      conversation.auto_type_from_tools([ "add_cars_to_collection" ])
      expect(conversation.reload.conversation_type).to eq("cars")
    end

    it "classifies as 'research' when launch_deep_research tool is used" do
      conversation = create(:agent_conversation, conversation_type: "general")
      conversation.auto_type_from_tools([ "launch_deep_research" ])
      expect(conversation.reload.conversation_type).to eq("research")
    end

    it "does nothing when tool_names is empty" do
      conversation = create(:agent_conversation, conversation_type: "general")
      conversation.auto_type_from_tools([])
      expect(conversation.reload.conversation_type).to eq("general")
    end
  end
end
