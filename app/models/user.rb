class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :omniauthable, omniauth_providers: [ :google_oauth2 ]

  SUPPORTED_LANGUAGES = %w[en de fr es it pt nl pl cs sk hu ro bg hr sl et lt lv fi sv da nb el ga uk].freeze

  SUPPORTED_CURRENCIES = %w[EUR USD GBP CHF PLN CZK HUF RON BGN HRK SEK NOK DKK ISK TRY UAH GEL ALL BAM MKD MDL RSD].freeze

  has_many :collections, dependent: :destroy
  has_many :collection_members, dependent: :destroy
  has_many :shared_collections, -> { where.not(collection_members: { role: :owner }) },
           through: :collection_members, source: :collection
  has_many :agent_conversations, dependent: :destroy
  has_many :api_logs, dependent: :nullify

  after_create :create_default_collection
  after_create :claim_pending_memberships

  validates :language, inclusion: { in: SUPPORTED_LANGUAGES }, allow_nil: true
  validates :currency, inclusion: { in: SUPPORTED_CURRENCIES }, allow_nil: true

  def self.ransackable_attributes(auth_object = nil)
    %w[id email name provider location_name currency theme language created_at updated_at]
  end

  def self.ransackable_associations(auth_object = nil)
    %w[collections]
  end

  private

  def create_default_collection
    collections.create!(name: "Favorites", default: true)
  end

  def claim_pending_memberships
    CollectionMember.where(invited_email: email, status: :pending, user_id: nil).update_all(user_id: id)
  end

  public

  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_create do |user|
      user.email = auth.info.email
      user.password = Devise.friendly_token[0, 20]
      user.name = auth.info.name
      user.avatar_url = auth.info.image
    end
  end
end
