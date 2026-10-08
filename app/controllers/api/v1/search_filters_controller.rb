class Api::V1::SearchFiltersController < Api::V1::BaseController
  include CollectionAccessible

  before_action :set_accessible_collection, only: [ :index ]
  before_action :set_editable_collection, only: [ :create, :update, :destroy, :refresh ]
  before_action :set_filter, only: [ :update, :destroy, :refresh ]

  def index
    filters = @collection.search_filters.order(created_at: :desc)
    render json: filters.map { |f| filter_json(f) }
  end

  def create
    url = filter_params[:search_url].to_s
    source = ListingSource.detect(url)
    unless source
      return render json: { error: "Unsupported search URL. Supported sites: mobile.de, otomoto.pl, autoscout24." }, status: :unprocessable_entity
    end

    parsed = source == "mobile_de" ? MobileDe::UrlParser.new.call(url) : GenericSearchUrlParser.new.call(url, source)

    filter = @collection.search_filters.create!(
      search_url: url,
      name: filter_params[:name] || parsed[:name],
      params: parsed[:params]
    )

    RefreshSearchFilterJob.perform_later(filter.id)
    render json: filter_json(filter), status: :created
  end

  def update
    @filter.update!(filter_params)
    render json: filter_json(@filter)
  end

  def destroy
    @filter.destroy!
    head :no_content
  end

  def refresh
    RefreshSearchFilterJob.perform_later(@filter.id)
    render json: { status: "refresh_queued" }
  end

  private

  def set_accessible_collection
    @collection = accessible_collections.find(params[:collection_id])
  end

  def set_editable_collection
    @collection = editable_collections.find(params[:collection_id])
  end

  def set_filter
    @filter = @collection.search_filters.find(params[:id])
  end

  def filter_params
    params.require(:search_filter).permit(:search_url, :name, :active)
  end

  def filter_json(filter)
    {
      id: filter.id,
      collection_id: filter.collection_id,
      search_url: filter.search_url,
      name: filter.name,
      params: filter.params,
      last_refreshed_at: filter.last_refreshed_at,
      active: filter.active,
      created_at: filter.created_at
    }
  end
end
