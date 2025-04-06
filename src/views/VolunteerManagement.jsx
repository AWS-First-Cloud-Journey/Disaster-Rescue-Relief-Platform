import React, { useState, useEffect } from "react";
import {
  Outlet,
  useNavigate,
  Navigate,
  useLocation,
} from "react-router-dom";
import { get, patch } from "aws-amplify/api";
import { withTranslation } from "react-i18next";
import { fetchUserAttributes } from "aws-amplify/auth";
import { useCollection } from "@cloudscape-design/collection-hooks";
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  Box,
  Table,
  Tabs,
  Pagination,
  CollectionPreferences,
  Flashbar,
  BreadcrumbGroup,
  TextFilter,
  Modal
} from "@cloudscape-design/components";
import NavBar from "../components/NavBar";
import { transformDateTime } from "./RequestList";

const apiName = "fcjemergency";
const path = "/volunteers";
const pathVerified = "/volunteers/verified";
const pathUnverified = "/volunteers/unverified";

function EmptyState({ title, subtitle, action }) {
  return (
    <Box textAlign="center" color="inherit">
      <Box variant="strong" textAlign="center" color="inherit">
        {title}
      </Box>
      <Box variant="p" padding={{ bottom: "s" }} color="inherit">
        {subtitle}
      </Box>
      {action}
    </Box>
  );
}

function VolunteerManagement(props) {
  const { t } = props;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [volunteers, setVolunteers] = useState([]);
  const [user, setUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTabId, setActiveTabId] = useState("unverified");
  const [selectedItems, setSelectedItems] = useState([]);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    content: "",
    onConfirm: () => {},
  });
  const [notification, setNotification] = useState({
    visible: false,
    type: "success",
    content: "",
    dismissible: true,
  });

  const [preferences, setPreferences] = useState({
    pageSize: 20,
    visibleContent: ["name", "phone", "email"],
  });

  const {
    items,
    actions,
    filteredItemsCount,
    collectionProps,
    filterProps,
    paginationProps,
  } = useCollection(volunteers, {
    filtering: {
      empty: <EmptyState title="No volunteers" />,
      noMatch: (
        <EmptyState
          title={t("common.no_matches")}
          action={
            <Button onClick={() => actions.setFiltering("")}>
              {t("common.clear_filter")}
            </Button>
          }
        />
      ),
    },
    pagination: { pageSize: preferences.pageSize },
    sorting: {},
    selection: {},
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await fetchUserAttributes();
        if (user["custom:role"] !== "admin") { 
          navigate("/");
        }
        setUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        // Handle error (e.g., redirect to login)
        navigate("/auth");
        // setLogin(false);
      } 
    };
    fetchUser();
  }, []);


  useEffect(() => {
    const loadData = async (type) => {
      setLoading(true);
      try {
        const restOperation = get({
          apiName: apiName,
          path: type === "unverified" ? pathUnverified : pathVerified,
        });
        const response = await restOperation.response;
        const json = await response.body.json();
        // console.log(json);
        if (type === "unverified") {
          console.log("unverified", json.unverifiedVolunteers);
          setVolunteers(json.unverifiedVolunteers);
        } else {
          setVolunteers(json.verifiedVolunteers);
        }
      } catch (error) {
        console.error("Error loading request details:", error);
        // setLogin(false);
      } finally {
        setLoading(false);
      }
    };

    if (activeTabId === "unverified") {
      loadData("unverified");
    } else if (activeTabId === "verified") {
      loadData("verified");
    }
  }, [activeTabId]);

  // Update your handling functions to show confirmation modals
  const showConfirmVerifyModal = (volunteer) => {
    // Show confirm popup
    setModalConfig({
      title: t("management_page.confirm_verify_title"),
      content: t("management_page.confirm_verify_content"),
      onConfirm: () => performVerifyRequest(volunteer),
    });
    setModalVisible(true);
  };

  const performVerifyRequest = async (volunteer) => {
    try {
      setActionLoading(true);
      // The actual API call
      const restOperation = patch({
        apiName: apiName,
        path: `/volunteers/${volunteer.id}/verify`,
      });

      await restOperation.response;

      // Update the UI
      const updatedVolunteers = volunteers.filter((v) => {
        return v.id != volunteer.id;
      });

      setVolunteers(updatedVolunteers);

      setNotification({
        visible: true,
        type: "success",
        content: t("management_page.success_verify"),
        dismissible: true,
      });
    } catch (error) {
      console.error("Error claiming request:", error);
      setNotification({
        visible: true,
        type: "error",
        content: t("management_page.error_verify"),
        dismissible: true,
      });
    } finally {
      setActionLoading(false);
      setModalVisible(false);
    }
  };

  return (
    <SpaceBetween size="l">
      {/* <NavBar user={user}/> */}
      <Outlet />
      <div className="dashboard-container">
        <BreadcrumbGroup
          items={[
            { text: t("home.home"), href: "/" },
            { text: t("nav.links.links-management"), href: "/management" },
          ]}
          ariaLabels={{
            itemAriaLabel: (e) => `Link to ${e.text}`,
          }}
        />
        <Container>
          {notification.visible && (
            <Flashbar
              items={[
                {
                  type: notification.type,
                  content: notification.content,
                  dismissible: notification.dismissible,
                  onDismiss: () =>
                    setNotification({ ...notification, visible: false }),
                },
              ]}
            />
          )}
          <SpaceBetween size="l">
            <Header variant="h1">{t("management_page.title")}</Header>
            <Tabs
              onChange={(detail) => setActiveTabId(detail.detail.activeTabId)}
              tabs={[
                {
                  label: t("management_page.unverified_tab"),
                  id: "unverified",
                  content: (
                    <Table
                      {...collectionProps}
                      onSelectionChange={({ detail }) =>
                        setSelectedItems(detail.selectedItems)
                      }
                      selectedItems={selectedItems}
                      ariaLabels={{
                        selectionGroupLabel: "Items selection",
                        allItemsSelectionLabel: ({ selectedItems }) =>
                          `${selectedItems.length} ${
                            selectedItems.length === 1 ? "item" : "items"
                          } selected`,
                        itemSelectionLabel: ({ selectedItems }, item) => {
                          const isItemSelected = selectedItems.filter(
                            (i) => i.Name === item.Name
                          ).length;
                          return `${item.Name} is ${
                            isItemSelected ? "" : "not"
                          } selected`;
                        },
                      }}
                      columnDefinitions={[
                        {
                          id: "username",
                          header: t("management_page.name"),
                          cell: (e) => e.name,
                          sortingField: "name",
                          isRowHeader: true,
                        },
                        {
                          id: "phone",
                          header: t("management_page.phone"),
                          cell: (e) => e.phone_number,
                        },
                        {
                          id: "email",
                          header: t("management_page.email"),
                          cell: (e) => e.email,
                        },
                        {
                          id: "verify",
                          header: "",
                          cell: (e) => (
                            <Button
                              onClick={() => showConfirmVerifyModal(e)}
                              loading={actionLoading}
                              disabled={actionLoading}
                            >
                              {t("management_page.verify")}
                            </Button>
                          ),
                        },
                      ]}
                      columnVisibility={preferences.visibleContent}
                      items={items}
                      loadingText={t("common.loading_text")}
                      loading={loading}
                      selectionType="multi"
                      trackBy="username"
                      empty={
                        <Box textAlign="center" color="inherit">
                          <b>{t("management_page.no_volunteer")}</b>
                          <Box
                            padding={{ bottom: "s" }}
                            variant="p"
                            color="inherit"
                          >
                            {t("management_page.no_display")}
                          </Box>
                        </Box>
                      }
                      filter={
                        <div className="input-container">
                          <TextFilter
                            {...filterProps}
                            filteringPlaceholder={t(
                              "management_page.find_volunteer"
                            )}
                          />
                        </div>
                      }
                      header={
                        <Header
                          counter={
                            selectedItems.length
                              ? "(" +
                                selectedItems.length +
                                `/${volunteers.length})`
                              : `(${volunteers.length})`
                          }
                        >
                          {t("management_page.unverified_tab")}
                        </Header>
                      }
                      pagination={<Pagination {...paginationProps} />}
                      preferences={
                        <CollectionPreferences
                          title={t("volunteer-page.card.pre")}
                          preferences={preferences}
                          confirmLabel={t("common.confirm")}
                          cancelLabel={t("common.cancel")}
                          pageSizePreference={{
                            title: t("volunteer-page.card.page-size"),
                            options: [
                              {
                                value: 20,
                                label: "20 " + t("management_page.volunteers"),
                              },
                              {
                                value: 40,
                                label: "40 " + t("management_page.volunteers"),
                              },
                              {
                                value: 60,
                                label: "60 " + t("management_page.volunteers"),
                              },
                            ],
                          }}
                          visibleContentPreference={{
                            title: t("volunteer-page.card.visible-content"),
                            options: [
                              {
                                label: t("volunteer-page.card.visible-desc"),
                                options: [
                                  {
                                    id: "name",
                                    label: t("management_page.name"),
                                    editable: false,
                                  },
                                  {
                                    id: "phone",
                                    label: t("management_page.phone"),
                                    editable: false,
                                  },
                                  {
                                    id: "email",
                                    label: t("management_page.email"),
                                    editable: false,
                                  },
                                ],
                              },
                            ],
                          }}
                          onConfirm={({ detail }) => setPreferences(detail)}
                        />
                      }
                    />
                  ),
                },
                {
                  label: t("management_page.verified_tab"),
                  id: "verified",
                  content: (
                    <Table
                      {...collectionProps}
                      onSelectionChange={({ detail }) =>
                        setSelectedItems(detail.selectedItems)
                      }
                      selectedItems={selectedItems}
                      ariaLabels={{
                        selectionGroupLabel: "Items selection",
                        allItemsSelectionLabel: ({ selectedItems }) =>
                          `${selectedItems.length} ${
                            selectedItems.length === 1 ? "item" : "items"
                          } selected`,
                        itemSelectionLabel: ({ selectedItems }, item) => {
                          const isItemSelected = selectedItems.filter(
                            (i) => i.Name === item.Name
                          ).length;
                          return `${item.Name} is ${
                            isItemSelected ? "" : "not"
                          } selected`;
                        },
                      }}
                      columnDefinitions={[
                        {
                          id: "username",
                          header: t("management_page.username"),
                          cell: (e) => e.name,
                          sortingField: "name",
                          isRowHeader: true,
                        },
                        {
                          id: "phone",
                          header: t("management_page.phone"),
                          cell: (e) => e.phone_number,
                        },
                        {
                          id: "email",
                          header: t("management_page.email"),
                          cell: (e) => e.email,
                        },
                        // {
                        //   id: "verify",
                        //   header: "",
                        //   cell: (e) => (
                        //     <Button
                        //       onClick={(e) => showConfirmVerifyModal(e)}
                        //       loading={actionLoading}
                        //       disabled={actionLoading}
                        //     >
                        //       {t("management_page.verify")}
                        //     </Button>
                        //   ),
                        // },
                      ]}
                      columnVisibility={preferences.visibleContent}
                      items={items}
                      loadingText={t("common.loading_text")}
                      loading={loading}
                      selectionType="multi"
                      trackBy="username"
                      empty={
                        <Box textAlign="center" color="inherit">
                          <b>{t("management_page.no_volunteer")}</b>
                          <Box
                            padding={{ bottom: "s" }}
                            variant="p"
                            color="inherit"
                          >
                            {t("management_page.no_display")}
                          </Box>
                        </Box>
                      }
                      filter={
                        <div className="input-container">
                          <TextFilter
                            {...filterProps}
                            filteringPlaceholder={t(
                              "management_page.find_volunteer"
                            )}
                          />
                        </div>
                      }
                      header={
                        <Header
                          counter={
                            selectedItems.length
                              ? "(" +
                                selectedItems.length +
                                `/${volunteers.length})`
                              : `(${volunteers.length})`
                          }
                        >
                          {t("management_page.verified_tab")}
                        </Header>
                      }
                      pagination={<Pagination {...paginationProps} />}
                      preferences={
                        <CollectionPreferences
                          title="Preferences"
                          preferences={preferences}
                          confirmLabel="Confirm"
                          cancelLabel="Cancel"
                          pageSizePreference={{
                            title: "Page size",
                            options: [
                              {
                                value: 20,
                                label: "20 " + t("management_page.volunteers"),
                              },
                              {
                                value: 40,
                                label: "40 " + t("management_page.volunteers"),
                              },
                              {
                                value: 60,
                                label: "60 " + t("management_page.volunteers"),
                              },
                            ],
                          }}
                          visibleContentPreference={{
                            title: "Select visible content",
                            options: [
                              {
                                label: "Main distribution properties",
                                options: [
                                  {
                                    id: "name",
                                    label: "User Name",
                                    editable: false,
                                  },
                                  {
                                    id: "phone",
                                    label: "Phone Number",
                                    editable: false,
                                  },
                                  {
                                    id: "email",
                                    label: "Email",
                                    editable: false,
                                  },
                                ],
                              },
                            ],
                          }}
                          onConfirm={({ detail }) => setPreferences(detail)}
                        />
                      }
                    />
                  ),
                },
              ]}
            />
          </SpaceBetween>
        </Container>
      </div>
      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        header={modalConfig.title}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setModalVisible(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" onClick={modalConfig.onConfirm}>
                {t("common.confirm")}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <Box padding="s">{modalConfig.content}</Box>
      </Modal>
    </SpaceBetween>
  );
}

export default withTranslation()(VolunteerManagement);
