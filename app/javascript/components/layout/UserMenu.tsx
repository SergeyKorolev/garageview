import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { UserCircleIcon, Cog6ToothIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/utils/cn";
import AccountModal from "@/components/account/AccountModal";

export default function UserMenu() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const [accountOpen, setAccountOpen] = useState(false);

  if (!user) {
    return (
      <a
        href="/users/auth/google_oauth2"
        data-method="post"
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        {t("auth.signIn")}
      </a>
    );
  }

  return (
    <>
      <Menu as="div" className="relative">
        <MenuButton className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <UserCircleIcon className="h-7 w-7 text-gray-500" />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-200">{user.name}</span>
        </MenuButton>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <MenuItems className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-gray-700" style={{ zIndex: 150 }}>
            <MenuItem>
              {({ active }) => (
                <span className={cn("block px-4 py-2 text-sm text-gray-500 dark:text-gray-400")}>
                  {user.email}
                </span>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => setAccountOpen(true)}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2 text-left text-sm cursor-pointer",
                    active ? "bg-gray-100 dark:bg-gray-700" : "",
                    "text-gray-700 dark:text-gray-200"
                  )}
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  {t("account.title")}
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => window.CookieConsent?.showPreferences()}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2 text-left text-sm cursor-pointer",
                    active ? "bg-gray-100 dark:bg-gray-700" : "",
                    "text-gray-700 dark:text-gray-200"
                  )}
                >
                  <ShieldCheckIcon className="h-4 w-4" />
                  {t("privacy.cookieSettings")}
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <form action="/users/sign_out" method="post">
                  <input type="hidden" name="_method" value="delete" />
                  <input
                    type="hidden"
                    name="authenticity_token"
                    value={document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ""}
                  />
                  <button
                    type="submit"
                    className={cn(
                      "block w-full px-4 py-2 text-left text-sm cursor-pointer",
                      active ? "bg-gray-100 dark:bg-gray-700" : "",
                      "text-gray-700 dark:text-gray-200"
                    )}
                  >
                    {t("auth.signOut")}
                  </button>
                </form>
              )}
            </MenuItem>
          </MenuItems>
        </Transition>
      </Menu>
      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </>
  );
}
