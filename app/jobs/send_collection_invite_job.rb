class SendCollectionInviteJob < ApplicationJob
  queue_as :default

  def perform(collection_member_id)
    member = CollectionMember.find(collection_member_id)
    return unless member.pending?

    MailtrapEmailService.send_collection_invite(member)
  end
end
