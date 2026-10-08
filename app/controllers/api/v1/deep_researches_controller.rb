module Api
  module V1
    class DeepResearchesController < BaseController
      include CollectionAccessible

      before_action :set_accessible_collection, only: [ :index, :show, :chat ]
      before_action :set_editable_collection, only: [ :create, :destroy, :share, :unshare ]

      def index
        researches = @collection.deep_researches.order(created_at: :desc)
        render json: researches.map { |r| research_json(r) }
      end

      def show
        research = @collection.deep_researches.find(params[:id])
        render json: research_json(research)
      end

      def create
        raw_car_ids = params[:car_ids]
        unless raw_car_ids.is_a?(Array)
          return render json: { error: "car_ids is required" }, status: :unprocessable_entity
        end

        car_ids = raw_car_ids.map(&:to_i).uniq

        if car_ids.size < 2 || car_ids.size > 20
          return render json: { error: "Select 2-20 cars to compare" }, status: :unprocessable_entity
        end

        unless @collection.cars.where(id: car_ids).count == car_ids.size
          return render json: { error: "All cars must belong to this collection" }, status: :unprocessable_entity
        end

        research = @collection.deep_researches.create!(
          car_ids: car_ids,
          status: "pending"
        )

        # Always run AI rating before deep research — ensures per-car AI analysis
        # (verdict, pros, cons, negotiation points, etc.) exists for every car.
        # AiCarRatingService skips cars that already have analysis, so this is cheap.
        AiRateThenResearchJob.perform_later(@collection.id, research.id)

        render json: { id: research.id, status: research.status }, status: :created
      end

      def chat
        research = @collection.deep_researches.find(params[:id])
        message = params[:message]
        history = params[:history] || []

        return render json: { error: "Message required" }, status: :unprocessable_entity if message.blank?

        result = DeepResearchChatService.chat(research, message, history)

        if result[:error]
          render json: { error: result[:error] }, status: :unprocessable_entity
        else
          render json: { reply: result[:reply] }
        end
      end

      def destroy
        research = @collection.deep_researches.find(params[:id])
        research.destroy!
        render json: { success: true }
      end

      def share
        research = @collection.deep_researches.find(params[:id])

        unless research.status == "completed"
          return render json: { error: "Only completed research can be shared" }, status: :unprocessable_entity
        end

        research.generate_share_token! unless research.shared?
        render json: { share_token: research.share_token, public_url: research.public_url }
      end

      def unshare
        research = @collection.deep_researches.find(params[:id])
        research.revoke_share_token!
        render json: { success: true }
      end

      private

      def set_accessible_collection
        @collection = accessible_collections.find(params[:collection_id])
      end

      def set_editable_collection
        @collection = editable_collections.find(params[:collection_id])
      end

      def research_json(research)
        {
          id: research.id,
          collection_id: research.collection_id,
          car_ids: research.car_ids,
          title: research.title,
          status: research.status,
          result: research.status == "completed" ? (JSON.parse(research.result) rescue research.result) : nil,
          share_token: research.share_token,
          public_url: research.public_url,
          created_at: research.created_at
        }
      end
    end
  end
end
