require "rails_helper"

RSpec.describe SearchFilter, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:collection) }
    it { is_expected.to have_many(:collection_cars).dependent(:nullify) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:search_url) }
  end

  describe "scopes" do
    describe ".active" do
      it "returns only active filters" do
        active = create(:search_filter, active: true)
        inactive = create(:search_filter, active: false)

        expect(SearchFilter.active).to include(active)
        expect(SearchFilter.active).not_to include(inactive)
      end
    end

    describe ".due_for_refresh" do
      it "returns active filters that have never been refreshed" do
        never_refreshed = create(:search_filter, active: true, last_refreshed_at: nil)
        expect(SearchFilter.due_for_refresh).to include(never_refreshed)
      end

      it "returns active filters refreshed more than 6 hours ago" do
        stale = create(:search_filter, active: true, last_refreshed_at: 7.hours.ago)
        expect(SearchFilter.due_for_refresh).to include(stale)
      end

      it "excludes recently refreshed or inactive filters" do
        recent = create(:search_filter, active: true, last_refreshed_at: 1.hour.ago)
        inactive = create(:search_filter, active: false, last_refreshed_at: nil)

        expect(SearchFilter.due_for_refresh).not_to include(recent)
        expect(SearchFilter.due_for_refresh).not_to include(inactive)
      end
    end
  end
end
