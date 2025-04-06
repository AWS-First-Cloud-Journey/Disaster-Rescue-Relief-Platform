import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate, useLocation, Outlet } from 'react-router-dom';
import { get, patch } from 'aws-amplify/api';
import { getUrl } from 'aws-amplify/storage';
import { fetchUserAttributes } from "aws-amplify/auth";
import { withTranslation } from "react-i18next";
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  Box,
  ContentLayout,
  ColumnLayout,
  Spinner,
  Modal,
  Flashbar,
  BreadcrumbGroup
} from '@cloudscape-design/components';
import NavBar from '../components/NavBar';
import { transformDateTime } from './RequestList';

const apiName = "fcjemergency";
const path = "/requesters";

function RequestDetail(props) {
  const { id } = useParams();
  const { t } = props;
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [login, setLogin] = useState(null);
  const [imgUrl, setImageUrl] = useState("");
  const { state } = useLocation();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    content: "",
    onConfirm: () => { },
  });
  const [notification, setNotification] = useState({
    visible: false,
    type: 'success',
    content: '',
    dismissible: true
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setRequest(state);
        // Get current user
        const userData = await fetchUserAttributes();
        setUser(userData);
        setLogin(true);

      } catch (error) {
        console.error('Error loading request details:', error);
        setLogin(false);
      } finally {
        setLoading(false);
      }
    };

    // Load image from s3
    const loadImage = async () => {
      if (state?.imageKey) {
        try {
          const getUrlResult = await getUrl({
            path: state.imageKey,
            options: {
              useAccelerateEndpoint: false
            },
          });
          setImageUrl(getUrlResult.url);
        } catch (err) {
          console.error('Error loading image:', err);
        }
      }
    }

    loadData();
    loadImage();
  }, [state]);

  const reloadRequest = async () => {
    try {
      setActionLoading(true);
      // Get request details
      const restOperation = get({
        apiName: 'fcjemergency',
        path: `/requesters/${request.id}`,
      });
      const response = await restOperation.response;
      const data = await response.body.json();

      if (data.success && data.data) {
        setRequest(data.data);

        // Reload image if needed
        if (data.data.imageKey && data.data.imageKey !== request.imageKey) {
          try {
            const getUrlResult = await getUrl({
              path: data.data.imageKey,
              options: {
                useAccelerateEndpoint: false
              },
            });
            setImageUrl(getUrlResult.url);
          } catch (err) {
            console.error('Error reloading image:', err);
          }
        }
      } else {
        console.error('Could not retrieve request details');
        setNotification({
          visible: true,
          type: 'error',
          content: t("detail-request-page.error_reload"),
          dismissible: true
        });
      }
    } catch (error) {
      console.error('Error reloading request:', error);
      setNotification({
        visible: true,
        type: 'error',
        content: t("detail-request-page.error_reload"),
        dismissible: true
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Update your handling functions to show confirmation modals
  const showConfirmClaimModal = () => {
    // Check if user is properly authenticated first
    if (!user || !user.sub) {
      setNotification({
        visible: true,
        type: 'error',
        content: t("detail-request-page.error_login"),
        dismissible: true
      });
      return;
    }

    setModalConfig({
      title: t("volunteer-page.confirm_title_1"),
      content: t("volunteer-page.confirm_mess_1"),
      onConfirm: () => performClaimRequest(),
    });
    setModalVisible(true);
  };

  const performClaimRequest = async () => {
    try {
      // Check if user and user.sub exist
      if (!user || !user.sub) {
        console.error('Cannot claim request: User ID not found');
        setNotification({
          visible: true,
          type: 'error',
          content: t("detail-request-page.error_login"),
          dismissible: true
        });
        setModalVisible(false);
        return;
      }

      setActionLoading(true);
      // The actual API call
      const restOperation = patch({
        apiName: apiName,
        path: `/requesters/${request.id}`,
        options: {
          body: {
            status: 'IN_PROGRESS',
            assignedUser: user.sub
          }
        }
      });

      await restOperation.response;
      await reloadRequest();

      setNotification({
        visible: true,
        type: 'success',
        content: t("detail-request-page.success_claim"),
        dismissible: true
      });
    } catch (error) {
      console.error('Error claiming request:', error);
      setNotification({
        visible: true,
        type: 'error',
        content: t("detail-request-page.error_claim"),
        dismissible: true
      });
    } finally {
      setActionLoading(false);
      setModalVisible(false);
    }
  };

  const showConfirmMarkDoneModal = () => {
    setModalConfig({
      title: t("volunteer-page.confirm_title_2"),
      content: t("volunteer-page.confirm_mess_2"),
      onConfirm: () => performMarkDone(),
    });
    setModalVisible(true);
  };

  const performMarkDone = async () => {
    try {
      setActionLoading(true);
      const restOperation = patch({
        apiName: apiName,
        path: `/requesters/${request.id}`,
        options: {
          body: {
            status: 'DONE'
          }
        }
      });

      await restOperation.response;
      await reloadRequest();

      setNotification({
        visible: true,
        type: 'success',
        content: t("detail-request-page.success_remark"),
        dismissible: true
      });
    } catch (error) {
      console.error('Error marking request as done:', error);
      setNotification({
        visible: true,
        type: 'error',
        content: t("detail-request-page.error_remark"),
        dismissible: true
      });
    } finally {
      setActionLoading(false);
      setModalVisible(false);
    }
  };

  const showConfirmResetStatusModal = () => {
    setModalConfig({
      title: t("volunteer-page.confirm_title_3"),
      content: t("volunteer-page.confirm_mess_3"),
      onConfirm: () => performResetStatus(),
    });
    setModalVisible(true);
  };

  const performResetStatus = async () => {
    try {
      setActionLoading(true);
      const restOperation = patch({
        apiName: apiName,
        path: `/requesters/${request.id}`,
        options: {
          body: {
            status: 'PENDING',
            assignedUser: null  // Clear the assigned user when resetting
          }
        }
      });

      await restOperation.response;
      await reloadRequest();

      setNotification({
        visible: true,
        type: 'success',
        content: t("detail-request-page.success_reset"),
        dismissible: true
      });
    } catch (error) {
      console.error('Error resetting request status:', error);
      setNotification({
        visible: true,
        type: 'error',
        content: t("detail-request-page.error_reset"),
        dismissible: true
      });
    } finally {
      setActionLoading(false);
      setModalVisible(false);
    }
  };

  if (login === false) {
    return <Navigate to="/auth" />;
  }

  if (loading) {
    return (
      <>
        <NavBar user={user} />
        <Box textAlign="center" padding={{ top: 'xxxl' }}>
          <Spinner size="large" />
          <Box padding={{ top: 's' }}>Loading request details...</Box>
        </Box>
      </>
    );
  }

  if (!request) {
    return (
      <>
        <NavBar user={user} />
        <Box textAlign="center" padding={{ top: 'xxxl' }}>
          <Box variant="h1">Request not found</Box>
          <Button onClick={() => navigate('/requestList')}>Back to Requests</Button>
        </Box>
      </>
    );
  }

  return (
    <>
      {/* <NavBar user={user} /> */}
      <Outlet />
      {notification.visible && (
        <Flashbar
          items={[
            {
              type: notification.type,
              content: notification.content,
              dismissible: notification.dismissible,
              onDismiss: () => setNotification({ ...notification, visible: false })
            }
          ]}
        />
      )}

      <ContentLayout
        defaultPadding
        header={(() => {
          let actionButton;
          let headerTitle = `${t("detail-request-page.title")} #${request.id}`;

          const completionBadge = request.status === 'DONE' && (
            <span style={{
              color: '#037f0c',
              fontSize: '0.9em',
              backgroundColor: '#ebfaef',
              padding: '4px 10px',
              borderRadius: '12px',
              verticalAlign: 'middle',
              marginRight: '10px',  // Add margin to separate from actions
              display: 'inline-block'
            }}>
              ✓ {t("detail-request-page.card.completed")}
            </span>
          );

          if (request.status === 'DONE') {
            // For completed requests, only admins can reset status
            if (user && user['custom:role'] === 'admin') {
              actionButton = (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    showConfirmResetStatusModal();
                  }}
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  {t("volunteer-page.card.reset-btn")}
                </Button>
              );
            }
          } else if (user && user['custom:role'] !== 'admin') {
            // For non-admin users with active requests
            if (user.sub === request.assignedUser) {
              // User is assigned to this request - show Done button
              actionButton = (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    showConfirmMarkDoneModal();
                  }}
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  {t("detail-request-page.card.mark_completed")}
                </Button>
              );
            } else if (request.status === 'PENDING') {
              // Unassigned request with PENDING status - show Claim button
              actionButton = (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    showConfirmClaimModal();
                  }}
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  {t("volunteer-page.card.claim-btn")}
                </Button>
              );
            }
          } else if (user && user['custom:role'] === 'admin' && request.status !== 'DONE') {
            // For admin users - show both claim and complete buttons for active requests
            actionButton = (
              <SpaceBetween direction="horizontal" size="xs">
                {request.status === 'PENDING' && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      showConfirmClaimModal();
                    }}
                    loading={actionLoading}
                    disabled={actionLoading}
                  >
                    {t("volunteer-page.card.claim-btn")}
                  </Button>
                )}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    showConfirmMarkDoneModal();
                  }}
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  {t("detail-request-page.card.mark_completed")}
                </Button>
              </SpaceBetween>
            );
          }

          const combinedActions = (
            <SpaceBetween direction="horizontal" size="xs">
              {completionBadge}
              {actionButton}
            </SpaceBetween>
          );

          return (
            <SpaceBetween size="m">
              <BreadcrumbGroup
                items={[
                  { text: t("home.home"), href: "/" },
                  { text: t("volunteer-page.title"), href: "/requestList" },
                  { text: `${t("detail-request-page.title")} #${request.id}`, href: "#" }
                ]}
                ariaLabel="Breadcrumbs"
              />
              <Header
                variant="h1"
                actions={combinedActions}
              >
                {headerTitle}
              </Header>
            </SpaceBetween>
          );
        })()}
      >
        <Container>
          <SpaceBetween size="l">
            <Box variant="h2">{t("detail-request-page.card.title_infor")}</Box>
            <ColumnLayout columns={2} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">{t("detail-request-page.card.name")}</Box>
                <div>{request.name}</div>
              </div>
              <div>
                <Box variant="awsui-key-label">{t("detail-request-page.card.phone")}</Box>
                <div>{request.phoneNumber}</div>
              </div>
              <div>
                <Box variant="awsui-key-label">{t("detail-request-page.card.address")}</Box>
                <div>{request.address}</div>
              </div>
              <div>
                <Box variant="awsui-key-label">{t("detail-request-page.card.people")}</Box>
                <div>{request.personCount}</div>
              </div>
            </ColumnLayout>

            <Box variant="h2">{t("detail-request-page.card.title_status")}</Box>
            <ColumnLayout columns={2} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">{t("detail-request-page.card.status")}</Box>
                <div>
                  <span className={`status-pill status-${request.status?.toLowerCase()}`}>
                    {request.status === 'DONE' && '✓ '}
                    {request.status === 'IN_PROGRESS' && '⟳ '}
                    {request.status === 'PENDING' && '⏱ '}
                    {t(`detail-request-page.card.${request.status.toLowerCase()}`)}
                  </span>
                </div>
              </div>
              <div>
                <Box variant="awsui-key-label">{t("detail-request-page.card.createdAt")}</Box>
                <div>{transformDateTime(request.createdAt)}</div>
              </div>
              {request.assignedUser && (
                <div>
                  <Box variant="awsui-key-label">{t("detail-request-page.card.assign_to")}</Box>
                  <div>{request.assignedUser}</div>
                </div>
              )}
            </ColumnLayout>

            <Box variant="h2">{t("detail-request-page.card.title_supply")}</Box>
            <ColumnLayout columns={3} variant="text-grid">
              {request.supply > 0 && (
                <div>
                  <Box variant="awsui-key-label">{t("detail-request-page.card.supply")}</Box>
                  <div>{request.supply} {t("detail-request-page.card.unit")}</div>
                </div>
              )}
              {request.bag > 0 && (
                <div>
                  <Box variant="awsui-key-label">{t("detail-request-page.card.bag")}</Box>
                  <div>{request.bag} {t("detail-request-page.card.unit")}</div>
                </div>
              )}
              {request.water > 0 && (
                <div>
                  <Box variant="awsui-key-label">{t("detail-request-page.card.water")}</Box>
                  <div>{request.water} {t("detail-request-page.card.water_unit")}</div>
                </div>
              )}
              {request.food > 0 && (
                <div>
                  <Box variant="awsui-key-label">{t("detail-request-page.card.food")}</Box>
                  <div>{request.food} {t("detail-request-page.card.food_unit")}</div>
                </div>
              )}
              {request.shelter > 0 && (
                <div>
                  <Box variant="awsui-key-label">{t("detail-request-page.card.shelter")}</Box>
                  <div>For {request.shelter} {t("detail-request-page.card.shelter_unit")}</div>
                </div>
              )}
              {request.bodyBag > 0 && (
                <div>
                  <Box variant="awsui-key-label">{t("detail-request-page.card.body_bag")}</Box>
                  <div>{request.bodyBag} {t("detail-request-page.card.unit")}</div>
                </div>
              )}
            </ColumnLayout>

            {request.mapLink && (
              <>
                <Box variant="h2">{t("detail-request-page.card.location")}</Box>
                <Box>
                  <a href={request.mapLink} target="_blank" rel="noopener noreferrer">
                  {t("detail-request-page.card.view_map")}
                  </a>
                </Box>
              </>
            )}

            {imgUrl && (
              <>
                <Box variant="h2">{t("detail-request-page.card.image")}</Box>
                <Box>
                  <img
                    src={imgUrl.toString()}
                    alt="Request documentation"
                    style={{ maxWidth: '100%', maxHeight: '400px' }}
                  />
                </Box>
              </>
            )}
          </SpaceBetween>
        </Container>
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
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={modalConfig.onConfirm}
                  loading={actionLoading}
                  disabled={actionLoading}
                >
                  Confirm
                </Button>
              </SpaceBetween>
            </Box>
          }
        >
          <Box padding="s">{modalConfig.content}</Box>
        </Modal>
      </ContentLayout>
    </>
  );
}

export default withTranslation()(RequestDetail);