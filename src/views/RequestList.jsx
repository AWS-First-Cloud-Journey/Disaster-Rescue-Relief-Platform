import React, { useState, useEffect, useLayoutEffect } from "react";
import { Navigate, useNavigate, Outlet } from "react-router-dom";
import { get, patch } from "aws-amplify/api";
import { getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import { withTranslation } from "react-i18next";
import {
  Cards,
  Box,
  SpaceBetween,
  Button,
  Header,
  Pagination,
  Select,
  LiveRegion,
  Input,
  CollectionPreferences,
  Modal,
  Link,
  BreadcrumbGroup,
  TextFilter,
  Table,
} from "@cloudscape-design/components";
import moment from "moment";
import { useCollection } from "@cloudscape-design/collection-hooks";
import NavBar from "../components/NavBar";

const apiName = "fcjemergency";
const path = "/requesters";
const verifyPath = "/volunteers/verified";
const SEARCHABLE_COLUMNS = ["name", "status", "id", "phoneNumber"];

export function transformDateTime(createAt) {
  const date = moment(createAt);
  return date.calendar(null, {
    sameDay: "LT",
    lastDay: "MMM D LT",
    lastWeek: "MMM D LT",
    sameElse: "l",
  });
}

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

function prepareSelectOptions(field, defaultOption) {
  // Building a non redundant list of the field passed as parameter.
  const optionSet = ["PENDING", "IN_PROGRESS", "DONE"];

  optionSet.sort();

  // The first element is the default one.
  let options = [defaultOption];

  // Adding the other element of the list.
  optionSet.forEach((item, index) =>
    options.push({ label: item, value: (index + 1).toString() })
  );
  return options;
}

function VolunteerTable(props) {
  const t = props.t;
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    pageSize: 10,
    visibleContent: ["name", "phoneNumber", "email"],
  });
  const {
    items,
    actions,
    filteredItemsCount,
    collectionProps,
    filterProps,
    paginationProps,
  } = useCollection(props.volunteers, {
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
  return (
    <Table
      {...collectionProps}
      onSelectionChange={({ detail }) =>
        props.setSelectedItems(detail.selectedItems)
      }
      selectedItems={props.selectedItems}
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
          return `${item.Name} is ${isItemSelected ? "" : "not"} selected`;
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
      ]}
      columnVisibility={preferences.visibleContent}
      items={items}
      loadingText={t("common.loading_text")}
      loading={loading}
      selectionType="single"
      trackBy="email"
      empty={
        <Box textAlign="center" color="inherit">
          <b>{t("management_page.no_volunteer")}</b>
          <Box padding={{ bottom: "s" }} variant="p" color="inherit">
            {t("management_page.no_display")}
          </Box>
        </Box>
      }
      filter={
        <div className="input-container">
          <TextFilter
            {...filterProps}
            filteringPlaceholder={t("management_page.find_volunteer")}
          />
        </div>
      }
      header={
        <Header
          counter={
            props.selectedItems.length
              ? "(" + props.selectedItems.length + `/${props.volunteers.length})`
              : `(${props.volunteers.length})`
          }
        >
          Verified Volunteers
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
  );
}

function RequestList(props) {
  const navigate = useNavigate();
  const { t } = props;
  const [defaultStatus] = useState({ value: "0", label: "Any Status" });
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [verifiedVolunteers, setVerifiedVolunteers] = useState([]);
  const [currentData, setCurrentData] = useState([]);
  const [status, setStatus] = useState(defaultStatus);
  const [user, setUser] = useState(null);
  const [login, setLogin] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [preferences, setPreferences] = useState({
    pageSize: 10,
    visibleContent: ["name", "phoneNumber", "status"],
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    content: "",
    onConfirm: () => {},
  });
  const [modalVolunteerVisible, setModalVolunteerVisible] = useState(false);
  const [modalVolunteerConfig, setModalVolunteerConfig] = useState({
    title: "",
    onConfirm: () => {},
  });
  const selectRequestOptions = prepareSelectOptions("status", defaultStatus);

  function matchesStatus(item, selectedStatus) {
    return (
      selectedStatus === defaultStatus || item.status === selectedStatus.label
    );
  }

  // Update your handling functions to show confirmation modals
  const showConfirmClaimModal = (id) => {
    // Check if user is properly authenticated first
    if (!user || !user.sub) {
      alert(
        "You need to be logged in with a valid account to claim this request"
      );
      return;
    }

    setModalConfig({
      title: t("volunteer-page.confirm_title_1"),
      content: t("volunteer-page.confirm_mess_1"),
      onConfirm: () => performClaimRequest(id),
    });
    setModalVisible(true);
  };

  const performClaimRequest = async (id) => {
    try {
      // Check if user and user.sub exist
      if (!user || !user.sub) {
        console.error("Cannot claim request: User ID not found");
        alert(
          "You need to be logged in with a valid account to claim this request"
        );
        setModalVisible(false);
        return;
      }

      // The actual API call
      const restOperation = patch({
        apiName: apiName,
        path: `/requesters/${id}`,
        options: {
          body: {
            status: "IN_PROGRESS",
            assignedUser: user.sub,
          },
        },
      });

      await restOperation.response;
      await getAllRequests();
    } catch (error) {
      console.error("Error claiming request:", error);
      alert(t("volunteer-page.fail_mess"));
    } finally {
      setModalVisible(false);
    }
  };

  const showConfirmMarkDoneModal = (id) => {
    setModalConfig({
      title: t("volunteer-page.confirm_title_2"),
      content: t("volunteer-page.confirm_mess_2"),
      onConfirm: () => performMarkDone(id),
    });
    setModalVisible(true);
  };

  const performMarkDone = async (id) => {
    try {
      const restOperation = patch({
        apiName: apiName,
        path: `/requesters/${id}`,
        options: {
          body: {
            status: "DONE",
          },
        },
      });

      await restOperation.response;
      await getAllRequests();
    } catch (error) {
      console.error("Error marking request as done:", error);
    } finally {
      setModalVisible(false);
    }
  };

  const showConfirmResetStatusModal = (id) => {
    setModalConfig({
      title: t("volunteer-page.confirm_title_3"),
      content: t("volunteer-page.confirm_mess_3"),
      onConfirm: () => performResetStatus(id),
    });
    setModalVisible(true);
  };

  const performResetStatus = async (id) => {
    try {
      const restOperation = patch({
        apiName: apiName,
        path: `/requesters/${id}`,
        options: {
          body: {
            status: "PENDING",
            assignedUser: null, // Clear the assigned user when resetting
          },
        },
      });

      await restOperation.response;
      await getAllRequests();
    } catch (error) {
      console.error("Error resetting request status:", error);
    } finally {
      setModalVisible(false);
    }
  };

  const handleAssignRequest = (id) => {
    // For admins - perhaps open a dialog to select a user to assign
    console.log("Admin assigning request", id);
    // Implement assignment logic here
    setModalVolunteerVisible(true);
    setCurrentData(verifiedVolunteers);
    setModalVolunteerConfig({
      title: t("volunteer-page.confirm_title_4"),
      onConfirm: () => performAssignRequest(id),
    });
  };

  const performAssignRequest = async (id) => {
    try {
      // Check if user and user.sub exist
      if (!user || !user.sub) {
        console.error("Cannot claim request: User ID not found");
        alert(
          "You need to be logged in with a valid account to claim this request"
        );
        setModalVolunteerVisible(false);
        return;
      }

      // The actual API call
      const restOperation = patch({
        apiName: apiName,
        path: `/requesters/${id}`,
        options: {
          body: {
            status: "IN_PROGRESS",
            assignedUser: selectedItems[0].id,
          },
        },
      });

      await restOperation.response;
      await getAllRequests();
    } catch (error) {
      console.error("Error claiming request:", error);
      alert(t("volunteer-page.fail_mess"));
    } finally {
      setModalVolunteerVisible(false);
    }
  };

  const {
    items,
    actions,
    filteredItemsCount,
    collectionProps,
    filterProps,
    paginationProps,
  } = useCollection(currentData, {
    filtering: {
      empty: <EmptyState title="No data" />,
      noMatch: (
        <EmptyState
          title="No matches"
          action={<Button onClick={() => clearFilter()}>Clear filter</Button>}
        />
      ),
      filteringFunction: (item, filteringText) => {
        if (!matchesStatus(item, status)) {
          return false;
        }
        const filteringTextLowerCase = filteringText.toLowerCase();

        return SEARCHABLE_COLUMNS.map((key) => item[key]).some(
          (value) =>
            typeof value === "string" &&
            value.toLowerCase().indexOf(filteringTextLowerCase) > -1
        );
      },
    },
    pagination: { pageSize: preferences.pageSize },
    sorting: {},
    selection: {},
  });

  useLayoutEffect(() => {
    collectionProps.ref.current?.scrollToTop();
  }, [status, collectionProps.ref, filterProps.filteringText]);

  useEffect(() => {
    setLoading(true);
    getUser().then((user) => {
      if (user) {
        getAllRequests();
        getVerifiedVolunteer();
      } else {
        setLoading(false);
      }
    });
  }, []);

  const getUser = async () => {
    try {
      // const user = await getCurrentUser();
      const user = await fetchUserAttributes();
      setUser(user);
      return user;
    } catch (error) {
      setLogin(false);
      console.error("Error getting current user:", error);
    }
  };

  const getAllRequests = async () => {
    try {
      // const response = await API.put(apiName, path, {body: data});
      const restOperation = get({
        apiName: apiName,
        path: path,
      });
      const response = await restOperation.response;
      const json = await response.body.json();
      setRequests(json.data);
      setCurrentData(json.data);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const getVerifiedVolunteer = async () => {
    try {
      // const response = await API.put(apiName, path, {body: data});
      const restOperation = get({
        apiName: apiName,
        path: verifyPath,
      });
      const response = await restOperation.response;
      const json = await response.body.json();
      setVerifiedVolunteers(json.verifiedVolunteers);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  function clearFilter() {
    actions.setFiltering("");
    setStatus(defaultStatus);
  }

  return (
    <>
      {login === false ? (
        <Navigate to="/auth" />
      ) : (
        <>
          {/* <NavBar user={user} /> */}
          <Outlet />
          <div class="container">
            <SpaceBetween size="m">
              <BreadcrumbGroup
                items={[
                  { text: t("home.home"), href: "/" },
                  { text: t("volunteer-page.title"), href: "#" },
                ]}
                ariaLabel="Breadcrumbs"
              />
              <Header variant="h1" description={t("volunteer-page.des")}>
                {t("volunteer-page.title")}
              </Header>
            </SpaceBetween>
            <Cards
              {...collectionProps}
              ariaLabels={{
                itemSelectionLabel: (e, i) => `select ${i.name}`,
                selectionGroupLabel: "Item selection",
              }}
              cardDefinition={{
                header: (item, index) => {
                  // Determine which button to display based on user role and request status
                  let actionButton;

                  if (item.status === "DONE") {
                    // For completed requests, only admins can reset status
                    if (user && user["custom:role"] === "admin") {
                      actionButton = (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent navigation
                            showConfirmResetStatusModal(item.id);
                          }}
                        >
                          {t("volunteer-page.card.reset-btn")}
                        </Button>
                      );
                    } else {
                      actionButton = null; // No actions for completed requests for non-admins
                    }
                  } else if (user && user["custom:role"] !== "admin") {
                    // For non-admin users with active requests
                    if (user.sub === item.assignedUser) {
                      // User is assigned to this request - show Done button
                      actionButton = (
                        <Button
                          variant="primary"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent navigation
                            showConfirmMarkDoneModal(item.id);
                          }}
                        >
                          {t("volunteer-page.card.done-btn")}
                        </Button>
                      );
                    } else if (item.status === "PENDING") {
                      // Unassigned request with PENDING status - show Claim button
                      actionButton = (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent navigation
                            showConfirmClaimModal(item.id);
                          }}
                        >
                          {t("volunteer-page.card.claim-btn")}
                        </Button>
                      );
                    }
                  } else if (
                    user &&
                    user["custom:role"] === "admin" &&
                    item.status !== "DONE"
                  ) {
                    // For admin users - show assign button for active requests
                    actionButton = (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent navigation
                          handleAssignRequest(item.id);
                        }}
                      >
                        {t("volunteer-page.card.assign-btn")}
                      </Button>
                    );
                  }

                  return (
                    <Header
                      fontSize="heading-m"
                      actions={
                        <SpaceBetween direction="horizontal" size="xs">
                          {item.status === "DONE" && (
                            <span
                              className="status-pill status-done"
                              onClick={(e) => e.stopPropagation()}
                            >
                              ✓ {t("volunteer-page.card.completed")}
                            </span>
                          )}
                          {item.status === "IN_PROGRESS" && (
                            <span
                              className="status-pill status-in-progress"
                              onClick={(e) => e.stopPropagation()}
                            >
                              ⟳ {t("volunteer-page.card.in-progress-l")}
                            </span>
                          )}
                          {item.status === "PENDING" && !actionButton && (
                            <span
                              className="status-pill status-pending"
                              onClick={(e) => e.stopPropagation()}
                            >
                              ⏱ {t("volunteer-page.card.pending-l")}
                            </span>
                          )}
                          {actionButton}
                        </SpaceBetween>
                      }
                    >
                      <Link
                        onClick={(e) =>
                          navigate(`/requestList/${item.id}`, { state: item })
                        }
                        fontSize="heading-l"
                      >
                        {t("volunteer-page.card.title")} #{item.id}
                      </Link>
                    </Header>
                  );
                },
                sections: [
                  {
                    id: "name",
                    header: t("volunteer-page.card.name"),
                    content: (item) => item.name,
                  },
                  {
                    id: "location",
                    header: t("volunteer-page.card.location"),
                    content: (item) => item.mapLink,
                  },
                  {
                    id: "phoneNumber",
                    header: t("volunteer-page.card.phone"),
                    content: (item) => item.phoneNumber,
                  },
                  {
                    id: "personCount",
                    header: t("volunteer-page.card.people"),
                    content: (item) => item.personCount,
                  },
                  {
                    id: "createdAt",
                    header: t("volunteer-page.card.createdAt"),
                    content: (item) => transformDateTime(item.createdAt),
                  },
                  {
                    id: "status",
                    header: t("volunteer-page.card.status"),
                    content: (item) => item.status,
                  },
                ],
              }}
              cardsPerRow={[{ cards: 1 }]}
              items={items}
              loadingText={t("common.loading_text")}
              loading={loading}
              stickyHeader
              visibleSections={preferences.visibleContent}
              variant="full-page"
              empty={
                <Box
                  margin={{ vertical: "xs" }}
                  textAlign="center"
                  color="inherit"
                >
                  <SpaceBetween size="m">
                    <b>{t("volunteer-page.card.no_req")}</b>
                    <Button>{t("volunteer-page.card.create_request")}</Button>
                  </SpaceBetween>
                </Box>
              }
              filter={
                <div className="input-container">
                  <div className="input-filter">
                    <Input
                      data-testid="input-filter"
                      type="search"
                      value={filterProps.filteringText}
                      onChange={(event) => {
                        actions.setFiltering(event.detail.value);
                      }}
                      ariaLabel={t("volunteer-page.card.find")}
                      placeholder={t("volunteer-page.card.find")}
                      clearAriaLabel="clear"
                    />
                  </div>
                  <div className="select-filter">
                    <Select
                      data-testid="request-filter"
                      inlineLabelText={t("volunteer-page.card.filter-title")}
                      options={selectRequestOptions}
                      selectedAriaLabel="Selected"
                      selectedOption={status}
                      onChange={(event) => {
                        setStatus(event.detail.selectedOption);
                      }}
                      expandToViewport={true}
                    />
                  </div>
                  <LiveRegion>
                    {(filterProps.filteringText ||
                      status !== defaultStatus) && (
                      <span className="filtering-results">
                        {filteredItemsCount}
                      </span>
                    )}
                  </LiveRegion>
                </div>
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
                        value: 10,
                        label: "10 " + t("volunteer-page.card.req"),
                      },
                      {
                        value: 30,
                        label: "30 " + t("volunteer-page.card.req"),
                      },
                      {
                        value: 50,
                        label: "50 " + t("volunteer-page.card.req"),
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
                            label: t("volunteer-page.card.name"),
                            editable: false,
                          },
                          {
                            id: "mapLink",
                            label: t("volunteer-page.card.location"),
                          },
                          {
                            id: "status",
                            label: t("volunteer-page.card.status"),
                          },
                          {
                            id: "phoneNumber",
                            label: t("volunteer-page.card.phone"),
                          },
                        ],
                      },
                    ],
                  }}
                  onConfirm={({ detail }) => setPreferences(detail)}
                />
              }
            />
            <Modal
              visible={modalVisible}
              onDismiss={() => setModalVisible(false)}
              header={modalConfig.title}
              footer={
                <Box float="right">
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      variant="link"
                      onClick={() => setModalVisible(false)}
                    >
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
            <Modal
              visible={modalVolunteerVisible}
              onDismiss={() => setModalVolunteerVisible(false)}
              header={modalVolunteerConfig.title}
              footer={
                <Box float="right">
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      variant="link"
                      onClick={() => setModalVolunteerVisible(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={modalVolunteerConfig.onConfirm}
                    >
                      {t("common.confirm")}
                    </Button>
                  </SpaceBetween>
                </Box>
              }
            >
              <VolunteerTable
                volunteers={verifiedVolunteers}
                t={t}
                selectedItems={selectedItems}
                setSelectedItems={(data) => setSelectedItems(data)}
              >
              </VolunteerTable>
            </Modal>
          </div>
        </>
      )}
    </>
  );
}

export default withTranslation()(RequestList);
