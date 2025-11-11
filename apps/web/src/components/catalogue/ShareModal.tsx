/**
 * Modal component for sharing catalogue lists
 */

import React, { useState, useEffect } from "react";
import {
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  CopyButton,
  ActionIcon,
  Tooltip,
  Modal,
  Loader,
  Box,
} from "@mantine/core";
import {
  IconCopy,
  IconCheck,
  IconQrcode,
  IconExternalLink,
} from "@tabler/icons-react";
import QRCode from "qrcode";
import { logger } from "@/lib/logger";

interface ShareModalProps {
  shareUrl: string;
  listTitle: string;
  onClose: () => void;
}

export function ShareModal({ shareUrl, listTitle, onClose }: ShareModalProps) {
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isGeneratingQR, setIsGeneratingQR] = useState(false); // T077: Loading state for QR generation

  useEffect(() => {
    if (showQR && shareUrl) {
      setIsGeneratingQR(true); // T077: Set loading state
      QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => {
          setQrCodeUrl(url);
          logger.debug("catalogue-ui", "QR code generated successfully", {
            urlLength: shareUrl.length
          });
        })
        .catch((error) => {
          logger.error("catalogue-ui", "Failed to generate QR code", {
            urlLength: shareUrl.length,
            error
          });
        })
        .finally(() => {
          setIsGeneratingQR(false); // T077: Clear loading state
        });
    }
  }, [showQR, shareUrl]);

  const handleOpenLink = () => {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Share this list with others by sending them this link:
        </Text>

        <Stack gap="xs">
          <Text size="sm" fw={500} component="label" htmlFor="share-url-field">Share URL</Text>
          <Group gap="xs">
            <TextInput
              id="share-url-field"
              value={shareUrl}
              readOnly
              flex={1}
              size="sm"
              aria-label="Share URL for this catalogue list"
              data-testid="share-url-input"
            />
            <CopyButton value={shareUrl}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copied!" : "Copy"}>
                  <Button
                    size="sm"
                    variant="light"
                    onClick={copy}
                    leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    aria-label={copied ? "URL copied to clipboard" : "Copy share URL to clipboard"}
                    data-testid="copy-share-url-button"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Stack>

        <Group>
          <Button
            variant={showQR ? "filled" : "outline"}
            leftSection={<IconQrcode size={16} />}
            onClick={() => setShowQR(!showQR)}
            size="sm"
            aria-expanded={showQR}
            aria-controls="qr-code-section"
            data-testid="toggle-qr-code-button"
          >
            {showQR ? "Hide" : "Show"} QR Code
          </Button>
          <Tooltip label="Open link in new tab">
            <ActionIcon
              onClick={handleOpenLink}
              size="lg"
              variant="light"
              aria-label="Open share link in new tab"
              data-testid="open-share-link-button"
            >
              <IconExternalLink size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* T077: Show loading spinner while generating QR code */}
        {showQR && isGeneratingQR && (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader size="md" />
          </Box>
        )}

        {showQR && !isGeneratingQR && qrCodeUrl && (
          <Stack align="center" gap="xs" id="qr-code-section">
            <Text size="sm" fw={500}>QR Code</Text>
            <img
              src={qrCodeUrl}
              alt={`QR Code containing share URL for ${listTitle}`}
              style={{ width: 200, height: 200 }}
              data-testid="share-qr-code"
            />
            <Text size="xs" c="dimmed">
              Scan with a mobile device to view this list
            </Text>
          </Stack>
        )}

        <Text size="xs" c="dimmed" ta="center">
          Anyone with this link can view and import this list. The link will remain active indefinitely.
        </Text>

        <Group justify="flex-end">
          <Button onClick={onClose}>
            Done
          </Button>
        </Group>
      </Stack>
    </>
  );
}